import 'dotenv/config';

// Premium high-fidelity simulated media items for Google Photos fallback
const SIMULATED_GOOGLE_PHOTOS = [
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
];

/**
 * Fetch all media items from Google Photos.
 * If credentials are not present, returns high-fidelity simulated content.
 * @param {Object} credentials - Optional credentials passed from admin config
 * @returns {Promise<Array>} List of media files
 */
export async function fetchGooglePhotos(credentials = {}) {
  const token = credentials.googleAccessToken || process.env.GOOGLE_PHOTOS_ACCESS_TOKEN;
  
  if (!token) {
    console.log('[Google Photos] Credentials missing. Running in Simulation Mode.');
    return SIMULATED_GOOGLE_PHOTOS;
  }

  try {
    console.log('[Google Photos] Fetching mediaItems via REST API...');
    const response = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=50', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Google Photos API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.mediaItems) return [];

    return data.mediaItems.map(item => {
      const isVideo = item.mimeType?.startsWith('video/') || item.mediaMetadata?.video;
      return {
        id: item.id,
        name: item.filename || `GooglePhoto_${item.id.substring(0, 8)}`,
        url: item.baseUrl,
        productUrl: item.productUrl,
        type: isVideo ? 'video' : 'photo',
        cloud: 'google-photos',
        size: parseInt(item.mediaMetadata?.width || '1024') * parseInt(item.mediaMetadata?.height || '768') * 3, // Estimated size
        date: item.mediaMetadata?.creationTime || new Date().toISOString()
      };
    });
  } catch (error) {
    console.error('[Google Photos API Error] Falling back to Simulation Mode:', error.message);
    return SIMULATED_GOOGLE_PHOTOS;
  }
}

/**
 * Upload a file buffer directly to Google Photos.
 * If credentials are not present, returns a simulated link.
 * @param {Buffer} fileBuffer - The memory buffer of the file
 * @param {string} filename - Filename
 * @param {string} mimeType - File mime type
 * @param {Object} credentials - Optional credentials from admin config
 * @returns {Promise<string>} Uploaded file direct/product URL
 */
export async function uploadToGooglePhotos(fileBuffer, filename, mimeType, credentials = {}) {
  const token = credentials.googleAccessToken || process.env.GOOGLE_PHOTOS_ACCESS_TOKEN;

  if (!token) {
    console.log(`[Google Photos Simulation] Mocking direct buffer upload for ${filename}...`);
    // Return a beautiful unsplash mockup or mixkit placeholder depending on type
    if (mimeType.startsWith('video/')) {
      return 'https://assets.mixkit.co/videos/preview/mixkit-car-driving-on-a-scenic-highway-during-sunset-34346-large.mp4';
    }
    return `https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=1200`;
  }

  try {
    console.log(`[Google Photos] Uploading raw buffer for ${filename} (${fileBuffer.length} bytes)...`);
    
    // Step 1: Upload raw bytes to retrieve an upload token
    const uploadRes = await fetch('https://photoslibrary.googleapis.com/v1/uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-type': 'application/octet-stream',
        'X-Goog-Upload-Content-Length': fileBuffer.length.toString(),
        'X-Goog-Upload-Protocol': 'raw'
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload bytes failed with status ${uploadRes.status}`);
    }

    const uploadToken = await uploadRes.text();
    console.log(`[Google Photos] Upload token acquired. Creating media item...`);

    // Step 2: Create the media item in the user's library
    const createRes = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newMediaItems: [
          {
            description: 'Uploaded via Nisanth Private Memory Wallet',
            simpleMediaItem: {
              uploadToken: uploadToken
            }
          }
        ]
      })
    });

    if (!createRes.ok) {
      throw new Error(`MediaItem creation failed with status ${createRes.status}`);
    }

    const createData = await createRes.json();
    const creationResult = createData.newMediaItemResults?.[0];
    
    if (creationResult?.status?.message && creationResult.status.message !== 'Success') {
      throw new Error(`Google Photos creation error: ${creationResult.status.message}`);
    }

    const mediaItem = creationResult?.mediaItem;
    console.log(`[Google Photos] Upload success! Registered ${mediaItem?.filename}`);
    
    // Return the direct product url or baseUrl as sync reference
    return mediaItem?.baseUrl || mediaItem?.productUrl || '';
  } catch (error) {
    console.error(`[Google Photos Upload Error] failed for ${filename}:`, error.message);
    throw error;
  }
}
