import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { getMegaStorage } from './mega.js';
import { getCloudConfig } from './cloudManager.js';
import MediaItem from '../models/MediaItem.js';

const MEMORIES_PATH = path.resolve('data/memories.json');

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

function readJsonFile(filePath, defaultValue = {}) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {}
}

/**
 * Unified Background & Manual Sync Worker
 * Scans all enabled MEGA nodes recursively, fetches file metadata, and saves to database.
 * @returns {Promise<Object>} Sync results metrics
 */
export async function syncClouds() {
  const config = await getCloudConfig();
  const logs = [];
  let addedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  logs.push(`Starting secure Cloud Sync cycle at ${new Date().toLocaleString()}`);

  // Loop through all three separate MEGA accounts
  for (const key of ['mega1', 'mega2', 'mega3']) {
    const enabled = config[`${key}Enabled`];
    const email = config[`${key}Email`];
    const password = config[`${key}Password`];

    if (enabled && email && password) {
      logs.push(`Scanning active storage card: ${key} (${email})...`);
      let storage = null;
      try {
        // Retrieve or initialize MEGA connection with automatic retry
        let retries = 3;
        while (retries > 0 && !storage) {
          try {
            storage = await getMegaStorage(email, password);
            if (!storage) throw new Error('MEGA authentication failed');
          } catch (err) {
            retries--;
            if (retries === 0) throw err;
            logs.push(`Connection failed for ${key}, retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        const appFolder = storage.root.children.find(child => child.name === 'BestiesMemoryWallet' && child.directory);
        if (!appFolder) {
          logs.push(`Folder /BestiesMemoryWallet not found on ${key}. Scanning skipped for this node.`);
          storage.close();
          continue;
        }

        // Recursive folder scanner to fetch name, size, type, URL, upload date
        const scanFolder = async (folder) => {
          for (const child of folder.children) {
            if (child.directory) {
              await scanFolder(child);
            } else {
              try {
                const filename = child.name;
                const ext = filename.split('.').pop().toLowerCase();
                
                // Determine file type
                let type = 'photo';
                if (['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) {
                  type = 'video';
                } else if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext)) {
                  type = 'document';
                }

                // Map category
                let category = 'Photos';
                if (type === 'video') category = 'Videos';
                else if (type === 'document') category = 'Documents';

                // Fetch public direct stream link with retry logic
                let link = '';
                let linkRetries = 3;
                while (linkRetries > 0 && !link) {
                  try {
                    link = await child.link();
                  } catch (e) {
                    linkRetries--;
                    if (linkRetries === 0) throw e;
                    await new Promise(r => setTimeout(r, 1000));
                  }
                }

                if (!link) throw new Error('Could not retrieve public file download link');

                const size = child.size || 0;
                const date = new Date().toISOString();

                // Save or update metadata inside Database / JSON fallbacks
                if (isDbConnected()) {
                  // MongoDB online synchronization
                  let existing = await MediaItem.findOne({ filename });
                  if (!existing) {
                    // Create new media item
                    const newItem = new MediaItem({
                      filename,
                      originalName: filename,
                      type,
                      category,
                      size,
                      uploadDate: date,
                      uploadedBy: 'Cloud Sync',
                      urls: {
                        [key]: link,
                        mega: link // Keep legacy compatibility
                      },
                      activeClouds: [key]
                    });
                    await newItem.save();
                    addedCount++;
                    logs.push(`[New File Detected] Seeding metadata for ${filename} inside MongoDB.`);
                  } else {
                    // Update existing media item links
                    let updated = false;
                    if (!existing.urls) existing.urls = {};
                    if (!existing.activeClouds) existing.activeClouds = [];

                    if (!existing.urls[key] || existing.urls[key] !== link) {
                      existing.urls[key] = link;
                      existing.urls.mega = link;
                      updated = true;
                    }
                    if (!existing.activeClouds.includes(key)) {
                      existing.activeClouds.push(key);
                      updated = true;
                    }
                    if (updated) {
                      existing.markModified('urls');
                      existing.markModified('activeClouds');
                      await existing.save();
                      updatedCount++;
                      logs.push(`[Updated Link] Synced active connection for ${filename} to ${key}.`);
                    }
                  }
                } else {
                  // Fallback JSON in offline/simulation mode
                  const db = readJsonFile(MEMORIES_PATH, { media: [], timeline: [] });
                  let existingIdx = db.media.findIndex(item => item.filename === filename);
                  if (existingIdx === -1) {
                    const newItem = {
                      id: 'sync_media_' + Date.now() + '_' + Math.round(Math.random() * 1000),
                      filename,
                      originalName: filename,
                      type,
                      category,
                      size,
                      uploadDate: date,
                      uploadedBy: 'Cloud Sync',
                      urls: {
                        [key]: link,
                        mega: link
                      },
                      activeClouds: [key]
                    };
                    db.media.unshift(newItem);
                    writeJsonFile(MEMORIES_PATH, db);
                    addedCount++;
                    logs.push(`[New File Detected] Seeding metadata for ${filename} inside JSON database.`);
                  } else {
                    let item = db.media[existingIdx];
                    let updated = false;
                    if (!item.urls) item.urls = {};
                    if (!item.activeClouds) item.activeClouds = [];

                    if (!item.urls[key] || item.urls[key] !== link) {
                      item.urls[key] = link;
                      item.urls.mega = link;
                      updated = true;
                    }
                    if (!item.activeClouds.includes(key)) {
                      item.activeClouds.push(key);
                      updated = true;
                    }
                    if (updated) {
                      db.media[existingIdx] = item;
                      writeJsonFile(MEMORIES_PATH, db);
                      updatedCount++;
                      logs.push(`[Updated Link] Synced active connection for ${filename} inside JSON.`);
                    }
                  }
                }

              } catch (fileErr) {
                errorCount++;
                logs.push(`Error indexing file ${child.name}: ${fileErr.message}`);
              }
            }
          }
        };

        await scanFolder(appFolder);
        storage.close();
        logs.push(`Successfully completed scanning for ${key}.`);
      } catch (nodeErr) {
        errorCount++;
        logs.push(`Failed scanning storage card ${key}: ${nodeErr.message}`);
        if (storage) {
          try { storage.close(); } catch (_) {}
        }
      }
    }
  }

  logs.push(`Cloud Sync cycle completed. Added: ${addedCount}, Updated: ${updatedCount}, Errors: ${errorCount}`);
  
  // Log final status in standard console logger
  console.log(logs.join('\n'));

  return { addedCount, updatedCount, errorCount, logs };
}
