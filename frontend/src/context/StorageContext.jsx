import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const StorageContext = createContext();

// HIGH-FIDELITY OFFLINE MOCK SEED DATA
const MOCK_CONFIG = {
  anniversaryDate: "2023-07-03T00:00:00+05:30",
  birthdays: {
    Gokul: "01-08",
    Nivetha: "12-02",
    BestiesDay: "06-08",
    AnniversaryDay: "07-03"
  },
  storageSetting: "both",
  localPath: "f:\\JOEE😉(●'◡'●)\\WebSite\\backend\\storage",
  megaEmail: "gps.officials.im@gmail.com",
  megaPassword: "••••••••",
  megaSyncInterval: 300000,
  sandboxMode: false,
  authorizedUsers: [
    {
      name: "Gokul",
      email: "gokul@besties.com",
      phone: "+919876543210",
      role: "owner",
      bio: "Gokul - The coding wizard and founder of our Besties Vault.",
      relationshipStory: "Started as classroom benchmates, bonding over music and programming. Now sharing a lifelong bond of friendship!",
      avatar: ""
    },
    {
      name: "Nivetha",
      email: "nivetha@besties.com",
      phone: "+918765432109",
      role: "secondary",
      bio: "Nivetha - The creative mind and ultimate guardian of our memories.",
      relationshipStory: "Bonded over coffee talks, life theories, and late-night rants. The ultimate best friend anyone could ever ask for!",
      avatar: ""
    }
  ]
};

const MOCK_MEDIA = [
  {
    id: "m1",
    filename: "first_meet.jpg",
    originalName: "First Day.jpg",
    type: "photo",
    category: "Photos",
    size: 102400,
    uploadDate: "2023-07-03T10:30:00.000Z",
    uploadedBy: "Gokul",
    localPath: "storage/first_meet.jpg",
    megaUrl: "https://mega.nz/simulated_first_meet",
    tags: ["first meet", "college", "friends", "beginning"]
  },
  {
    id: "m2",
    filename: "cafe_chill.jpg",
    originalName: "Cafe Chill.jpg",
    type: "photo",
    category: "Memories",
    size: 256000,
    uploadDate: "2024-01-08T18:00:00.000Z",
    uploadedBy: "Nivetha",
    localPath: "storage/cafe_chill.jpg",
    megaUrl: "https://mega.nz/simulated_cafe_chill",
    tags: ["cafe", "birthday", "cake", "fun"]
  },
  {
    id: "m3",
    filename: "beach_trip.mp4",
    originalName: "Beach Trip.mp4",
    type: "video",
    category: "Videos",
    size: 5120000,
    uploadDate: "2024-06-08T16:20:00.000Z",
    uploadedBy: "Gokul",
    localPath: "storage/beach_trip.mp4",
    megaUrl: "https://mega.nz/simulated_beach_trip",
    tags: ["beach", "waves", "travel", "sunset"]
  }
];

const MOCK_TIMELINE = [
  {
    id: "t1",
    date: "2023-07-03",
    title: "The Day It All Began",
    description: "Our official besties anniversary! We decided that no matter what life throws at us, we will stick together as partners-in-crime.",
    mediaUrls: ["/api/media/placeholder/first_meet.jpg"]
  },
  {
    id: "t2",
    date: "2024-01-08",
    title: "Gokul's Birthday Celebration",
    description: "Nivetha planned a surprise chocolate cake and custom card. It was one of the most heartwarming birthday celebrations ever!",
    mediaUrls: ["/api/media/placeholder/cafe_chill.jpg"]
  },
  {
    id: "t3",
    date: "2024-06-08",
    title: "Besties Day Road Trip",
    description: "Celebrated International Besties Day with an amazing drive to the beach. Took tons of videos and laughed till our stomachs hurt.",
    mediaUrls: ["/api/media/placeholder/beach_trip.mp4"]
  }
];

export function StorageProvider({ children }) {
  const { user, token, logout } = useAuth() || {};
  const [media, setMedia] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [config, setConfig] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadQueueLength, setUploadQueueLength] = useState(0);
  const [isOffline, setIsOffline] = useState(false);

  // Add a notification toast popup
  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter(t => t.id !== id));
  };

  // Centrally wrapped fetch supporting dynamic JWT Injection & auto-logout on session expiration
  const authenticatedFetch = async (url, options = {}) => {
    const headers = options.headers || {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      
      if (response.status === 401 || response.status === 403) {
        console.warn('[StorageContext] Auth token expired or invalid. Logging out...', response.status);
        showToast('Your session has expired. Please log in again.', 'error');
        if (logout) {
          logout();
        }
        throw new Error('Session expired');
      }
      
      return response;
    } catch (err) {
      if (err.message === 'Session expired') throw err;
      console.error('[StorageContext] Network request failed:', err);
      throw err;
    }
  };

  // Fetch initial media, timelines, and config data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [mediaRes, timelineRes, configRes] = await Promise.all([
        authenticatedFetch(window.API_URL + '/api/media'),
        authenticatedFetch(window.API_URL + '/api/timeline'),
        authenticatedFetch(window.API_URL + '/api/config')
      ]);

      if (!mediaRes.ok || !timelineRes.ok || !configRes.ok) {
        throw new Error('Server response error');
      }

      const mediaData = await mediaRes.json();
      const timelineData = await timelineRes.json();
      const configData = await configRes.json();

      setMedia(mediaData);
      setTimeline(timelineData);
      setConfig(configData);
      setIsOffline(false);
    } catch (error) {
      if (error.message === 'Session expired') return;
      console.warn('[StorageContext] Local backend offline. Attempting to fetch deployed static database from GitHub...', error);
      setIsOffline(true);
      
      let loadedStatic = false;
      try {
        // Attempt to load latest copies directly from the static deploy location
        const [staticMediaRes, staticTimelineRes, staticConfigRes] = await Promise.all([
          fetch('memories.json'),
          fetch('timeline.json'),
          fetch('config.json')
        ]);

        if (staticMediaRes.ok && staticTimelineRes.ok && staticConfigRes.ok) {
          const mediaData = await staticMediaRes.json();
          const timelineData = await staticTimelineRes.json();
          const configData = await staticConfigRes.json();

          setMedia(mediaData);
          setTimeline(timelineData);
          setConfig(configData);

          // Update local fallback caches so they stay synced
          localStorage.setItem('fallback_media', JSON.stringify(mediaData));
          localStorage.setItem('fallback_timeline', JSON.stringify(timelineData));
          localStorage.setItem('fallback_config', JSON.stringify(configData));

          loadedStatic = true;
          showToast('Loaded latest memories from Cloud Storage!', 'success');
        }
      } catch (staticErr) {
        console.warn('[StorageContext] Deployed static database load failed. Reverting to browser cache.', staticErr);
      }

      if (!loadedStatic) {
        // Fetch or seed local storage fallbacks
        const localMedia = localStorage.getItem('fallback_media');
        const localTimeline = localStorage.getItem('fallback_timeline');
        const localConfig = localStorage.getItem('fallback_config');

        if (localMedia) {
          setMedia(JSON.parse(localMedia));
        } else {
          setMedia(MOCK_MEDIA);
          localStorage.setItem('fallback_media', JSON.stringify(MOCK_MEDIA));
        }

        if (localTimeline) {
          setTimeline(JSON.parse(localTimeline));
        } else {
          setTimeline(MOCK_TIMELINE);
          localStorage.setItem('fallback_timeline', JSON.stringify(MOCK_TIMELINE));
        }

        if (localConfig) {
          setConfig(JSON.parse(localConfig));
        } else {
          setConfig(MOCK_CONFIG);
          localStorage.setItem('fallback_config', JSON.stringify(MOCK_CONFIG));
        }

        showToast('Connecting in Offline Browser Sandbox Mode! 👭', 'info');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    // Open Server-Sent Events stream for instant filesystem synchronization alerts only if user is logged in
    if (!user) return;
    
    let eventSource = null;
    
    const connectSse = () => {
      if (isOffline) return; // Skip if operating offline
      
      console.log('[StorageContext] Opening real-time SSE watch sync link...');
      eventSource = new EventSource(window.API_URL + '/api/media/events');
      
      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'refresh') {
            console.log('[SSE Event] Folder change detected. Refreshing media grid...');
            showToast('Files manually added to /storage folder detected! Syncing...', 'info');
            
            // Re-fetch media list
            authenticatedFetch(window.API_URL + '/api/media')
              .then(res => res.json())
              .then(mediaData => {
                setMedia(mediaData);
              })
              .catch(err => console.error('[SSE Event] Failed reloading media:', err));
          }
        } catch (err) {
          console.error('[SSE Event] Parse error:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn('[SSE Link] Lost connection. Retrying in 15s...');
        eventSource.close();
        setTimeout(connectSse, 15000);
      };
    };

    connectSse();

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [isOffline, user]);

  // Fetch Admin logs
  const fetchActivities = async (userName) => {
    if (userName !== 'Gokul') return;
    if (isOffline) {
      const mockActivities = JSON.parse(localStorage.getItem('fallback_activities') || '[]');
      setActivities(mockActivities);
      return;
    }
    try {
      const res = await authenticatedFetch(`${window.API_URL}/api/admin/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (e) {
      console.error('[StorageContext] Failed to fetch logs:', e);
    }
  };

  // Log activity inside browser fallback
  const logActivityOffline = (user, type, details, status = 'Success') => {
    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const newEntry = {
      'Timestamp (IST)': timestamp,
      'User': user,
      'Activity Type': type,
      'Details': details,
      'Status': status,
      'IP Address': '127.0.0.1 (Offline Browser)'
    };
    const current = JSON.parse(localStorage.getItem('fallback_activities') || '[]');
    current.unshift(newEntry);
    localStorage.setItem('fallback_activities', JSON.stringify(current));
    setActivities(current);
  };

  // Upload multi-files
  const uploadFiles = async (files, category, uploadedBy, folder = 'storage1') => {
    setUploadProgress(0);
    setUploadQueueLength(files.length);

    if (isOffline) {
      // Handle browser sandbox upload fallback
      try {
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) return prev;
            return prev + 10;
          });
        }, 150);

        await new Promise(r => setTimeout(r, 1200));
        clearInterval(progressInterval);
        setUploadProgress(100);

        const newItems = Array.from(files).map((file, i) => ({
          id: 'offline_media_' + Date.now() + '_' + i,
          filename: 'beach_trip.mp4', // Use beautiful placeholder image asset
          originalName: file.name,
          type: file.type.startsWith('video/') ? 'video' : 'photo',
          category: category,
          folder: folder,
          size: file.size,
          uploadDate: new Date().toISOString(),
          uploadedBy: uploadedBy,
          localPath: 'storage/beach_trip.mp4',
          megaUrl: 'https://mega.nz/simulated_file',
          tags: [category.toLowerCase()]
        }));

        const updatedMedia = [...newItems, ...media];
        setMedia(updatedMedia);
        localStorage.setItem('fallback_media', JSON.stringify(updatedMedia));

        logActivityOffline(uploadedBy, 'Upload', `Uploaded offline file: ${files[0].name} to ${category} (${folder})`, 'Success');
        showToast(`${files.length} memory item(s) simulated in offline sandbox vault!`, 'success');
        
        setTimeout(() => {
          setUploadProgress(0);
          setUploadQueueLength(0);
        }, 1000);
        return true;
      } catch (err) {
        showToast(err.message, 'error');
        return false;
      }
    }
    
    const formData = new FormData();
    formData.append('category', category);
    formData.append('folder', folder);
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const response = await authenticatedFetch(window.API_URL + '/api/media/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setMedia((prev) => [...data.uploadedItems, ...prev]);
      showToast('Memory item(s) uploaded locally! MEGA Cloud syncing in background.', 'success');
      
      if (uploadedBy === 'Gokul') fetchActivities(uploadedBy);

      setTimeout(() => {
        setUploadProgress(0);
        setUploadQueueLength(0);
      }, 1000);

      return true;
    } catch (error) {
      setUploadProgress(0);
      setUploadQueueLength(0);
      showToast(error.message, 'error');
      return false;
    }
  };

  // Delete media
  const deleteMedia = async (id, userName) => {
    if (isOffline) {
      const updatedMedia = media.filter(m => m.id !== id);
      setMedia(updatedMedia);
      localStorage.setItem('fallback_media', JSON.stringify(updatedMedia));
      logActivityOffline(userName, 'Delete Media', 'Deleted offline file', 'Success');
      showToast('Media removed from the offline vault', 'success');
      return true;
    }

    try {
      const response = await authenticatedFetch(`${window.API_URL}/api/media/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete media item');
      }

      setMedia((prev) => prev.filter(m => m.id !== id));
      showToast('Media removed from the vault', 'success');
      
      if (userName === 'Gokul') fetchActivities(userName);
      return true;
    } catch (error) {
      showToast(error.message, 'error');
      return false;
    }
  };

  // Add / Edit Timeline Story Card
  const saveTimelineEntry = async (entry, author) => {
    if (isOffline) {
      const timelineEntry = {
        ...entry,
        id: entry.id || 'offline_timeline_' + Date.now(),
        mediaUrls: entry.mediaUrls || ["/api/media/placeholder/first_meet.jpg"]
      };

      let updatedTimeline = [];
      if (entry.id) {
        updatedTimeline = timeline.map(t => t.id === entry.id ? timelineEntry : t);
        logActivityOffline(author, 'Edit Timeline', `Updated offline card: ${entry.title}`);
      } else {
        updatedTimeline = [timelineEntry, ...timeline];
        logActivityOffline(author, 'Create Timeline', `Created offline card: ${entry.title}`);
      }

      setTimeline(updatedTimeline);
      localStorage.setItem('fallback_timeline', JSON.stringify(updatedTimeline));
      showToast('Memory story saved directly to browser offline timeline!', 'success');
      return true;
    }

    try {
      const response = await authenticatedFetch(window.API_URL + '/api/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save timeline story');
      }

      const timelineRes = await authenticatedFetch(window.API_URL + '/api/timeline');
      const timelineData = await timelineRes.json();
      setTimeline(timelineData);

      showToast('Memory story saved directly to timeline!', 'success');
      if (author === 'Gokul') fetchActivities(author);
      return true;
    } catch (error) {
      showToast(error.message, 'error');
      return false;
    }
  };

  // Delete Timeline Story
  const deleteTimelineEntry = async (id, author) => {
    if (isOffline) {
      const updatedTimeline = timeline.filter(t => t.id !== id);
      setTimeline(updatedTimeline);
      localStorage.setItem('fallback_timeline', JSON.stringify(updatedTimeline));
      logActivityOffline(author, 'Delete Timeline', 'Deleted offline card');
      showToast('Story card removed from offline timeline', 'success');
      return true;
    }

    try {
      const response = await authenticatedFetch(`${window.API_URL}/api/timeline/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete timeline card');
      }

      setTimeline((prev) => prev.filter(t => t.id !== id));
      showToast('Story card removed from timeline', 'success');
      if (author === 'Gokul') fetchActivities(author);
      return true;
    } catch (error) {
      showToast(error.message, 'error');
      return false;
    }
  };

  // Trigger manual sync
  const triggerMegaSync = async (userName) => {
    if (userName !== 'Gokul') return;
    setSyncing(true);
    showToast('Sync with MEGA Cloud Storage triggered...', 'info');

    if (isOffline) {
      await new Promise(r => setTimeout(r, 2000));
      logActivityOffline('Gokul', 'Sync', 'Cloud sync simulated successfully', 'Success');
      showToast('Offline sync with MEGA simulated successfully!', 'success');
      setSyncing(false);
      return;
    }

    try {
      const response = await authenticatedFetch(`${window.API_URL}/api/admin/sync`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Cloud sync failed to start');
      
      showToast('Sync is running in the background. Progress logged in activities.', 'success');
      
      setTimeout(() => {
        fetchActivities(userName);
      }, 5000);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Update Config Data (Admin panel)
  const saveConfig = async (newConfig, userName) => {
    if (isOffline) {
      setConfig(newConfig);
      localStorage.setItem('fallback_config', JSON.stringify(newConfig));
      logActivityOffline(userName, 'Admin Change', 'Updated system configs offline', 'Success');
      showToast('Browser offline config updated instantly!', 'success');
      return true;
    }

    try {
      const response = await authenticatedFetch(`${window.API_URL}/api/config/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save config');
      }

      showToast('Admin config updated instantly!', 'success');
      
      const configRes = await authenticatedFetch(window.API_URL + '/api/config');
      const configData = await configRes.json();
      setConfig(configData);
      
      fetchActivities(userName);
      return true;
    } catch (error) {
      showToast(error.message, 'error');
      return false;
    }
  };

  // Update bio / story on sidebars
  const saveProfileUpdates = async (editorName, targetName, bio, relationshipStory) => {
    if (isOffline) {
      const updatedUsers = config.authorizedUsers.map(u => {
        if (u.name === targetName) {
          return { ...u, bio, relationshipStory };
        }
        return u;
      });

      const newConfig = { ...config, authorizedUsers: updatedUsers };
      setConfig(newConfig);
      localStorage.setItem('fallback_config', JSON.stringify(newConfig));

      logActivityOffline(editorName, 'Profile Edit', `Edited offline profile details for ${targetName}`);
      showToast('Profile edits updated locally in browser!', 'success');
      return true;
    }

    try {
      const response = await authenticatedFetch(window.API_URL + '/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetName, bio, relationshipStory })
      });

      if (!response.ok) {
        throw new Error('Failed to update bio details');
      }

      showToast('Profile edits updated directly!', 'success');
      
      const configRes = await authenticatedFetch(window.API_URL + '/api/config');
      const configData = await configRes.json();
      setConfig(configData);

      if (editorName === 'Gokul') fetchActivities(editorName);
      return true;
    } catch (error) {
      showToast(error.message, 'error');
      return false;
    }
  };

  return (
    <StorageContext.Provider value={{
      media,
      timeline,
      config,
      activities,
      loading,
      syncing,
      toasts,
      uploadProgress,
      uploadQueueLength,
      showToast,
      removeToast,
      uploadFiles,
      deleteMedia,
      saveTimelineEntry,
      deleteTimelineEntry,
      triggerMegaSync,
      saveConfig,
      saveProfileUpdates,
      fetchActivities,
      isOffline,
      refreshAllData: fetchData
    }}>
      {children}
      
      {/* Dynamic Floating Toast Container */}
      <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`cursor-pointer p-4 rounded-xl shadow-lg border backdrop-blur-md flex items-center gap-3 animate-slide-up transition-all duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800 dark:bg-emerald-950/90 dark:border-emerald-800 dark:text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-50/90 border-rose-200 text-rose-800 dark:bg-rose-950/90 dark:border-rose-800 dark:text-rose-200'
                : toast.type === 'info'
                ? 'bg-indigo-50/90 border-indigo-200 text-indigo-800 dark:bg-indigo-950/90 dark:border-indigo-800 dark:text-indigo-200'
                : 'bg-amber-50/90 border-amber-200 text-amber-800 dark:bg-amber-950/90 dark:border-amber-800 dark:text-amber-200'
            }`}
          >
            <span className="text-xl">
              {toast.type === 'success' ? '✨' : toast.type === 'error' ? '⚠️' : toast.type === 'info' ? '📧' : '🔔'}
            </span>
            <div className="flex-1 font-medium text-sm">{toast.message}</div>
            <button className="text-xs opacity-50 hover:opacity-100">&times;</button>
          </div>
        ))}
      </div>
    </StorageContext.Provider>
  );
}

export function useStorage() {
  return useContext(StorageContext);
}
