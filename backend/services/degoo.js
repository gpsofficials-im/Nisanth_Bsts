import 'dotenv/config';

// Premium high-fidelity simulated media items for Degoo fallback
const SIMULATED_DEGOO = [
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
];

/**
 * Fetch files from Degoo Backups REST API.
 * If credentials are not present, returns high-fidelity simulated content.
 * @param {Object} credentials - Optional credentials passed from config
 * @returns {Promise<Array>} List of media files
 */
export async function fetchDegoo(credentials = {}) {
  const token = credentials.degooAccessToken || process.env.DEGOO_ACCESS_TOKEN;

  if (!token) {
    console.log('[Degoo] Credentials missing. Fetching Simulated Degoo files.');
    return SIMULATED_DEGOO;
  }

  try {
    console.log('[Degoo] Querying Degoo backups REST API...');
    const response = await fetch('https://api.degoo.com/v1/backups/files', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Degoo API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.files) return [];

    return data.files.map(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const isVideo = ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext);
      return {
        id: file.id || `degoo_${Math.random().toString(36).substring(7)}`,
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
    return SIMULATED_DEGOO;
  }
}

/**
 * Upload a memory buffer directly to Degoo backups.
 * If credentials are not configured, returns a simulated link.
 * @param {Buffer} fileBuffer - File raw binary buffer
 * @param {string} filename - Filename
 * @param {string} mimeType - Mime type
 * @param {Object} credentials - Optional override credentials
 * @returns {Promise<string>} Uploaded file access URL
 */
export async function uploadToDegoo(fileBuffer, filename, mimeType, credentials = {}) {
  const token = credentials.degooAccessToken || process.env.DEGOO_ACCESS_TOKEN;

  if (!token) {
    console.log(`[Degoo Simulation] Mocking direct buffer upload of ${filename}...`);
    return `https://degoo.com/simulated_file_${Date.now()}`;
  }

  try {
    console.log(`[Degoo] Sending binary buffer for ${filename} to Degoo API...`);
    
    // We append the binary buffer into standard multipart form data
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, filename);

    const response = await fetch('https://api.degoo.com/v1/backups/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Degoo upload failed with status ${response.status}`);
    }

    const result = await response.json();
    console.log(`[Degoo] Upload successful! URL: ${result.downloadUrl}`);
    return result.downloadUrl || result.url || '';
  } catch (error) {
    console.error(`[Degoo Upload Error] Failed for ${filename}:`, error.message);
    throw error;
  }
}
