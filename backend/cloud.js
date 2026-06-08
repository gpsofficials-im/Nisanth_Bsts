import { getMegaStorage } from './mega.js';
import 'dotenv/config';


// ----------------------------------------------------
// HIGH-FIDELITY SIMULATED FILE DATA (PREMIUM AESTHETICS)
// ----------------------------------------------------
const SIMULATED_FILES = {
  'google-photos': [
    {
      id: 'g_photo_1',
      name: 'Romantic Sunset Walk.jpg',
      url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=1200',
      type: 'photo',
      cloud: 'google-photos',
      size: 2451024,
      date: '2025-07-03T18:30:00Z'
    },
    {
      id: 'g_photo_2',
      name: 'Coffee & Code Sessions.jpg',
      url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=1200',
      type: 'photo',
      cloud: 'google-photos',
      size: 1843200,
      date: '2025-09-12T10:15:00Z'
    },
    {
      id: 'g_video_3',
      name: 'Besties Day Road Trip.mp4',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-car-driving-on-a-scenic-highway-during-sunset-34346-large.mp4',
      type: 'video',
      cloud: 'google-photos',
      size: 47185920,
      date: '2026-02-14T16:45:00Z'
    }
  ],
  'mega': [
    {
      id: 'm_photo_1',
      name: 'Graduation Memories.jpg',
      url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1200',
      type: 'photo',
      cloud: 'mega',
      size: 3250585,
      date: '2025-05-18T11:00:00Z'
    },
    {
      id: 'm_video_2',
      name: 'Surprise Birthday Cake.mp4',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-friends-celebrating-a-birthday-with-sparklers-and-cake-42031-large.mp4',
      type: 'video',
      cloud: 'mega',
      size: 89128960,
      date: '2025-12-02T19:00:00Z'
    },
    {
      id: 'm_photo_3',
      name: 'Late Night Deep Chats.jpg',
      url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=1200',
      type: 'photo',
      cloud: 'mega',
      size: 2202009,
      date: '2026-01-20T23:30:00Z'
    }
  ],
  'degoo': [
    {
      id: 'd_photo_1',
      name: 'Beach Volley Fun.jpg',
      url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200',
      type: 'photo',
      cloud: 'degoo',
      size: 1572864,
      date: '2025-08-06T15:20:00Z'
    },
    {
      id: 'd_photo_2',
      name: 'Cozy Winter Getaway.jpg',
      url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=1200',
      type: 'photo',
      cloud: 'degoo',
      size: 3040870,
      date: '2025-12-25T08:00:00Z'
    },
    {
      id: 'd_video_3',
      name: 'Concert Rock Night Out.mp4',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-concert-crowd-raising-hands-under-colorful-lights-42861-large.mp4',
      type: 'video',
      cloud: 'degoo',
      size: 125829120,
      date: '2026-03-30T21:40:00Z'
    }
  ]
};

// ----------------------------------------------------
// 1. GOOGLE PHOTOS API INTEGRATION
// ----------------------------------------------------
async function fetchGooglePhotosFiles() {
  const token = process.env.GOOGLE_PHOTOS_ACCESS_TOKEN;
  if (!token) {
    console.log('[Google Photos] Access token missing. Using Simulated Files.');
    return SIMULATED_FILES['google-photos'];
  }

  try {
    console.log('[Google Photos] Fetching mediaItems via Google Photos Library API...');
    const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=50', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Google API returned status ${response.status}`);
    }

    const data = await response.json();
    if (!data.mediaItems) return [];

    return data.mediaItems.map(item => {
      const isVideo = item.mimeType?.startsWith('video/') || item.mediaMetadata?.video;
      return {
        id: item.id,
        name: item.filename || 'GooglePhoto_' + item.id.substring(0, 8),
        url: item.baseUrl,
        type: isVideo ? 'video' : 'photo',
        cloud: 'google-photos',
        size: parseInt(item.mediaMetadata?.width || '1024') * parseInt(item.mediaMetadata?.height || '768') * 3, // Estimated raw size
        date: item.mediaMetadata?.creationTime || new Date().toISOString()
      };
    });
  } catch (error) {
    console.error('[Google Photos API Error] Falling back to Simulated Files:', error.message);
    return SIMULATED_FILES['google-photos'];
  }
}

// ----------------------------------------------------
// 2. MEGA CLOUD STORAGE INTEGRATION
// ----------------------------------------------------
async function fetchMegaFiles() {
  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;

  if (!email || !password) {
    console.log('[MEGA Aggregator] Credentials missing. Using Simulated Files.');
    return SIMULATED_FILES['mega'];
  }

  try {
    console.log('[MEGA Aggregator] Logging in to active MEGA session for file scanning...');
    const storage = await getMegaStorage(email, password);
    if (!storage) throw new Error('MEGA authentication failed');

    const appFolder = storage.root.children.find(child => child.name === 'BestiesMemoryWallet' && child.directory);
    if (!appFolder) {
      storage.close();
      return [];
    }

    const allFiles = [];
    
    // Recursive folder scanner
    const scanFolder = async (folder) => {
      for (const child of folder.children) {
        if (child.directory) {
          await scanFolder(child);
        } else {
          try {
            const ext = child.name.split('.').pop().toLowerCase();
            const isVideo = ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext);
            const link = await child.link();
            allFiles.push({
              id: 'mega_' + child.downloadId[0],
              name: child.name,
              url: link,
              type: isVideo ? 'video' : 'photo',
              cloud: 'mega',
              size: child.size || 0,
              date: new Date().toISOString() // MEGA node creation timestamps can be mocked here
            });
          } catch (e) {
            // Skip individual linking errors
          }
        }
      }
    };

    await scanFolder(appFolder);
    storage.close();
    return allFiles;
  } catch (error) {
    console.error('[MEGA API Error] Falling back to Simulated Files:', error.message);
    return SIMULATED_FILES['mega'];
  }
}

// ----------------------------------------------------
// 3. DEGOO API BACKUP INTEGRATION
// ----------------------------------------------------
async function fetchDegooFiles() {
  const token = process.env.DEGOO_ACCESS_TOKEN;
  if (!token) {
    console.log('[Degoo] Access token missing. Using Simulated Files.');
    return SIMULATED_FILES['degoo'];
  }

  try {
    console.log('[Degoo] Querying Degoo backups REST API...');
    const response = await fetch('https://api.degoo.com/v1/backups/files', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Degoo API returned status ${response.status}`);
    }

    const data = await response.json();
    if (!data.files) return [];

    return data.files.map(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const isVideo = ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext);
      return {
        id: file.id,
        name: file.name,
        url: file.downloadUrl,
        type: isVideo ? 'video' : 'photo',
        cloud: 'degoo',
        size: file.size || 0,
        date: file.modifiedAt || new Date().toISOString()
      };
    });
  } catch (error) {
    console.error('[Degoo API Error] Falling back to Simulated Files:', error.message);
    return SIMULATED_FILES['degoo'];
  }
}

// ----------------------------------------------------
// UNIFIED AGGREGATOR
// ----------------------------------------------------
export async function getAggregatedCloudFiles(filterSource = 'all') {
  console.log(`[Cloud Aggregator] Loading cloud file aggregates (source filter: ${filterSource})...`);
  
  const results = {
    'google-photos': [],
    'mega': [],
    'degoo': []
  };

  const promises = [];

  if (filterSource === 'all' || filterSource === 'google-photos') {
    promises.push(
      fetchGooglePhotosFiles().then(files => {
        results['google-photos'] = files;
      })
    );
  }

  if (filterSource === 'all' || filterSource === 'mega') {
    promises.push(
      fetchMegaFiles().then(files => {
        results['mega'] = files;
      })
    );
  }

  if (filterSource === 'all' || filterSource === 'degoo') {
    promises.push(
      fetchDegooFiles().then(files => {
        results['degoo'] = files;
      })
    );
  }

  // Wait for all active fetches to complete concurrently
  await Promise.all(promises);

  // Merge the results seamlessly into a single array
  const mergedFiles = [
    ...results['google-photos'],
    ...results['mega'],
    ...results['degoo']
  ];

  // Sort files by date descending (newest first)
  mergedFiles.sort((a, b) => new Date(b.date) - new Date(a.date));

  return mergedFiles;
}
