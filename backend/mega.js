import { Storage } from 'megajs';
import fs from 'fs';
import path from 'path';

/**
 * Attempt to initialize a connection with MEGA Storage
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<Storage|null>} Connected storage client or null
 */
export async function getMegaStorage(email, password) {
  if (!email || !password) {
    console.log('[MEGA] Credentials missing. MEGA Operations will run in Simulated/Offline mode.');
    return null;
  }

  try {
    const storage = new Storage({
      email: email,
      password: password,
      keepalive: true
    });
    
    await new Promise((resolve, reject) => {
      storage.ready.then(resolve).catch(reject);
      // Timeout after 8 seconds
      setTimeout(() => reject(new Error('MEGA Connection Timeout')), 8000);
    });

    console.log('[MEGA] Logged in successfully to MEGA Cloud Storage!');
    return storage;
  } catch (error) {
    console.error('[MEGA] Authentication failed:', error.message);
    return null;
  }
}

/**
 * Ensure a directory path exists on the MEGA node list, returning the target folder node.
 * @param {Storage} storage - Active MEGA storage
 * @param {string} folderName - Subfolder name (e.g. 'Photos')
 * @returns {Promise<File|Folder>} Folder node
 */
async function getOrCreateMegaFolder(storage, folderName) {
  const root = storage.root;
  
  // Find or create parent app folder
  let appFolder = root.children.find(child => child.name === 'BestiesMemoryWallet' && child.directory);
  if (!appFolder) {
    appFolder = await root.mkdir('BestiesMemoryWallet');
    console.log('[MEGA] Created root /BestiesMemoryWallet folder');
  }

  // Find or create the specific category folder
  let categoryFolder = appFolder.children.find(child => child.name === folderName && child.directory);
  if (!categoryFolder) {
    categoryFolder = await appFolder.mkdir(folderName);
    console.log(`[MEGA] Created subfolder /BestiesMemoryWallet/${folderName}`);
  }

  return categoryFolder;
}

/**
 * Upload a local file to the selected category folder on MEGA
 * @param {string} email 
 * @param {string} password 
 * @param {string} localFilePath - Path on disk
 * @param {string} fileName - Destination file name
 * @param {string} category - Photos, Videos, Stories, Memories
 * @returns {Promise<string>} File download URL or mock URL
 */
export async function uploadToMega(email, password, localFilePath, fileName, category) {
  const storage = await getMegaStorage(email, password);
  if (!storage) {
    console.log(`[MEGA] Mocking cloud upload of '${fileName}' to category '${category}'`);
    return `https://mega.nz/simulated_file_${Date.now()}`;
  }

  try {
    const targetFolder = await getOrCreateMegaFolder(storage, category);
    
    // Read local file buffer
    const fileBuffer = fs.readFileSync(localFilePath);
    
    console.log(`[MEGA] Uploading ${fileName} to MEGA folder /BestiesMemoryWallet/${category} (${fileBuffer.length} bytes)...`);
    
    const file = await targetFolder.upload({
      name: fileName,
      size: fileBuffer.length
    }, fileBuffer).complete;

    const link = await file.link();
    console.log(`[MEGA] Upload completed! Link: ${link}`);
    storage.close();
    return link;
  } catch (error) {
    console.error(`[MEGA] File upload failed for ${fileName}:`, error);
    if (storage) storage.close();
    throw error;
  }
}

/**
 * Upload a local file to MEGA Cloud with automatic retries
 * @param {string} email 
 * @param {string} password 
 * @param {string} localFilePath 
 * @param {string} fileName 
 * @param {string} category 
 * @param {number} retries - Maximum retries
 * @returns {Promise<string>} File download URL
 */
export async function uploadToMegaWithRetry(email, password, localFilePath, fileName, category, retries = 3) {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await uploadToMega(email, password, localFilePath, fileName, category);
    } catch (error) {
      attempt++;
      console.warn(`[MEGA Upload Retry] Attempt ${attempt} failed for ${fileName}:`, error.message);
      if (attempt >= retries) {
        throw new Error(`MEGA Upload completely failed after ${retries} attempts: ${error.message}`);
      }
      // Wait 2 seconds before retrying
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

/**
 * Sync entire local media storage files to MEGA
 * @param {string} email - MEGA User
 * @param {string} password - MEGA Pass
 * @param {string} localVaultDir - Local folder directory path
 * @param {Array} mediaDatabase - Array of media files from JSON db
 * @returns {Promise<{syncedCount: number, errorCount: number, logs: string[]}>}
 */
export async function syncLocalAndMega(email, password, localVaultDir, mediaDatabase) {
  const logs = [];
  let syncedCount = 0;
  let errorCount = 0;

  logs.push(`Starting sync cycle at ${new Date().toLocaleString()}`);
  
  if (!fs.existsSync(localVaultDir)) {
    logs.push(`Error: Local vault directory ${localVaultDir} does not exist.`);
    return { syncedCount, errorCount, logs };
  }

  const storage = await getMegaStorage(email, password);
  if (!storage) {
    logs.push('MEGA connection unavailable. Sync skipped (Running local-only or mock).');
    return { syncedCount, errorCount, logs };
  }

  try {
    // We will scan each media entry in the DB
    for (const item of mediaDatabase) {
      let localFilePath = path.join(localVaultDir, item.filename);
      if (!fs.existsSync(localFilePath)) {
        const category = (item.category || 'Photos').toLowerCase() === 'videos' ? 'videos' : 'photos';
        const folder = (item.folder || 'storage1').toLowerCase();
        localFilePath = path.join(localVaultDir, category, folder, item.filename);
      }
      
      // If local file exists and doesn't have a megaUrl registered, we sync it!
      if (fs.existsSync(localFilePath) && !item.megaUrl) {
        try {
          logs.push(`Syncing file: ${item.filename} (${item.category})...`);
          
          const targetFolder = await getOrCreateMegaFolder(storage, item.category);
          
          // Check if file already exists in this folder on MEGA first to avoid double uploads
          const existingFile = targetFolder.children.find(child => child.name === item.filename && !child.directory);
          
          let link = '';
          if (existingFile) {
            link = await existingFile.link();
            logs.push(`File ${item.filename} already on MEGA. Linked existing node.`);
          } else {
            const fileBuffer = fs.readFileSync(localFilePath);
            const uploadedFile = await targetFolder.upload({
              name: item.filename,
              size: fileBuffer.length
            }, fileBuffer).complete;
            link = await uploadedFile.link();
            logs.push(`Uploaded ${item.filename} to MEGA successfully.`);
          }

          item.megaUrl = link;
          syncedCount++;
        } catch (err) {
          errorCount++;
          logs.push(`Failed syncing ${item.filename}: ${err.message}`);
        }
      }
    }

    logs.push(`Sync complete. Synced: ${syncedCount}, Errors: ${errorCount}`);
  } catch (error) {
    logs.push(`Sync aborted due to system error: ${error.message}`);
  } finally {
    if (storage) storage.close();
  }

  return { syncedCount, errorCount, logs };
}
