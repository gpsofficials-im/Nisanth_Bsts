import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import 'dotenv/config';

// Import Mongoose Models
import CloudAccount from '../models/CloudAccount.js';
import MediaItem from '../models/MediaItem.js';
import ActivityLog from '../models/ActivityLog.js';

// Import direct cloud providers
import { uploadToGooglePhotos, fetchGooglePhotos } from './googlePhotos.js';
import { uploadToMega, fetchMega, getMegaAccountInfo } from './mega.js';
import { uploadToDegoo, fetchDegoo } from './degoo.js';

const CONFIG_PATH = path.resolve('data/config.json');

/**
 * Check if MongoDB is connected successfully
 */
function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Helper to read local JSON fallback config safely
 */
function readLocalConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (error) {
    return {};
  }
}

/**
 * Helper to write local JSON fallback config safely
 */
function writeLocalConfig(data) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {}
}

/**
 * Load cloud settings from MongoDB with absolute safety fallbacks.
 * Seed values automatically from config.json or environment variables if db empty.
 * @returns {Promise<Object>} Unified Config object
 */
export async function getCloudConfig() {
  const localConfig = readLocalConfig();
  
  const defaults = {
    googlePhotosEnabled: localConfig.googlePhotosEnabled !== undefined ? localConfig.googlePhotosEnabled : !!process.env.GOOGLE_PHOTOS_ACCESS_TOKEN,
    googleAccessToken: localConfig.googleAccessToken || process.env.GOOGLE_PHOTOS_ACCESS_TOKEN || '',
    
    mega1Enabled: localConfig.mega1Enabled !== undefined ? localConfig.mega1Enabled : !!localConfig.megaEmail,
    mega1Email: localConfig.mega1Email || localConfig.megaEmail || '',
    mega1Password: localConfig.mega1Password || localConfig.megaPassword || '',
    
    mega2Enabled: localConfig.mega2Enabled !== undefined ? localConfig.mega2Enabled : false,
    mega2Email: localConfig.mega2Email || '',
    mega2Password: localConfig.mega2Password || '',
    
    mega3Enabled: localConfig.mega3Enabled !== undefined ? localConfig.mega3Enabled : false,
    mega3Email: localConfig.mega3Email || '',
    mega3Password: localConfig.mega3Password || '',

    degooEnabled: localConfig.degooEnabled !== undefined ? localConfig.degooEnabled : !!process.env.DEGOO_ACCESS_TOKEN,
    degooAccessToken: localConfig.degooAccessToken || process.env.DEGOO_ACCESS_TOKEN || ''
  };

  if (!isDbConnected()) {
    console.log('[CloudManager] Database offline. Returning local storage config settings.');
    return defaults;
  }

  try {
    // Fetch all account bindings
    const accounts = await CloudAccount.find({});
    
    // Seed initial records if DB is empty
    if (accounts.length === 0) {
      console.log('[CloudManager] Database initialized. Seeding CloudAccount entries...');
      await CloudAccount.create([
        { provider: 'google', accountEmail: 'google.admin@gmail.com', displayName: 'Admin Google Photos', isActive: defaults.googlePhotosEnabled, credentials: { accessToken: defaults.googleAccessToken } },
        { provider: 'mega1', accountEmail: defaults.mega1Email || 'mega1.admin@gmail.com', displayName: 'Admin MEGA Storage 1', isActive: defaults.mega1Enabled, credentials: { appPassword: defaults.mega1Password } },
        { provider: 'mega2', accountEmail: defaults.mega2Email || 'mega2.admin@gmail.com', displayName: 'Admin MEGA Storage 2', isActive: defaults.mega2Enabled, credentials: { appPassword: defaults.mega2Password } },
        { provider: 'mega3', accountEmail: defaults.mega3Email || 'mega3.admin@gmail.com', displayName: 'Admin MEGA Storage 3', isActive: defaults.mega3Enabled, credentials: { appPassword: defaults.mega3Password } },
        { provider: 'degoo', accountEmail: 'degoo.admin@gmail.com', displayName: 'Admin Degoo Storage', isActive: defaults.degooEnabled, credentials: { accessToken: defaults.degooAccessToken } }
      ]);
      return defaults;
    }

    const config = {};
    accounts.forEach(acc => {
      if (acc.provider === 'google') {
        config.googlePhotosEnabled = acc.isActive;
        config.googleAccessToken = acc.credentials?.accessToken || '';
      } else if (acc.provider === 'mega1') {
        config.mega1Enabled = acc.isActive;
        config.mega1Email = acc.accountEmail || '';
        config.mega1Password = acc.credentials?.appPassword || '';
      } else if (acc.provider === 'mega2') {
        config.mega2Enabled = acc.isActive;
        config.mega2Email = acc.accountEmail || '';
        config.mega2Password = acc.credentials?.appPassword || '';
      } else if (acc.provider === 'mega3') {
        config.mega3Enabled = acc.isActive;
        config.mega3Email = acc.accountEmail || '';
        config.mega3Password = acc.credentials?.appPassword || '';
      } else if (acc.provider === 'degoo') {
        config.degooEnabled = acc.isActive;
        config.degooAccessToken = acc.credentials?.accessToken || '';
      }
    });

    return { ...defaults, ...config };
  } catch (error) {
    console.error('[CloudManager Config Error] failed querying MongoDB:', error.message);
    return defaults;
  }
}

/**
 * Update cloud storage configurations inside MongoDB & JSON sync fallbacks.
 * Supports accounts switching, removal, connecting, and disconnecting seamlessly.
 * @param {Object} newConfig - Configuration delta
 * @returns {Promise<Object>} Updated unified config object
 */
export async function updateCloudConfig(newConfig) {
  // Sync to local JSON fallback first
  const localConfig = { ...readLocalConfig(), ...newConfig };
  writeLocalConfig(localConfig);

  if (!isDbConnected()) {
    console.log('[CloudManager] Database offline. Configurations saved in-memory fallback.');
    return localConfig;
  }

  try {
    console.log('[CloudManager] Syncing storage settings delta to MongoDB...');
    
    // 1. Update Google Photos
    if (newConfig.googlePhotosEnabled !== undefined || newConfig.googleAccessToken !== undefined) {
      await CloudAccount.findOneAndUpdate(
        { provider: 'google' },
        { 
          $set: { 
            isActive: newConfig.googlePhotosEnabled !== undefined ? newConfig.googlePhotosEnabled : true,
            'credentials.accessToken': newConfig.googleAccessToken || ''
          } 
        },
        { upsert: true, new: true }
      );
    }

    // 2. Loop-based MEGA accounts update
    for (const key of ['mega1', 'mega2', 'mega3']) {
      const enabledKey = `${key}Enabled`;
      const emailKey = `${key}Email`;
      const passKey = `${key}Password`;

      if (newConfig[enabledKey] !== undefined || newConfig[emailKey] !== undefined || newConfig[passKey] !== undefined) {
        await CloudAccount.findOneAndUpdate(
          { provider: key },
          {
            $set: {
              accountEmail: newConfig[emailKey] !== undefined ? newConfig[emailKey] : '',
              isActive: newConfig[enabledKey] !== undefined ? newConfig[enabledKey] : true,
              'credentials.appPassword': newConfig[passKey] !== undefined ? newConfig[passKey] : ''
            }
          },
          { upsert: true, new: true }
        );
      }
    }

    // 3. Update Degoo Cloud
    if (newConfig.degooEnabled !== undefined || newConfig.degooAccessToken !== undefined) {
      await CloudAccount.findOneAndUpdate(
        { provider: 'degoo' },
        {
          $set: {
            isActive: newConfig.degooEnabled !== undefined ? newConfig.degooEnabled : true,
            'credentials.accessToken': newConfig.degooAccessToken || ''
          } 
        },
        { upsert: true, new: true }
      );
    }

    return await getCloudConfig();
  } catch (error) {
    console.error('[CloudManager Config Error] failed updating MongoDB config:', error.message);
    return localConfig;
  }
}

/**
 * Parallel upload to all active/enabled clouds in MongoDB.
 * Saves result files directly to MediaItem database.
 * @param {Buffer} fileBuffer - The binary buffer in memory
 * @param {string} filename - Filename
 * @param {string} mimeType - File mime type
 * @param {string} category - Photos, Videos, Documents
 * @returns {Promise<Object>} Object containing target urls and active clouds array
 */
export async function uploadToActiveClouds(fileBuffer, filename, mimeType, category) {
  const config = await getCloudConfig();
  const urls = {};
  const activeClouds = [];
  const promises = [];

  const normalizedCategory = category || 'Photos';

  // 1. Google Photos Upload
  if (config.googlePhotosEnabled) {
    activeClouds.push('google');
    promises.push(
      uploadToGooglePhotos(fileBuffer, filename, mimeType, config)
        .then(url => { urls.google = url; })
        .catch(err => {
          console.error(`[CloudManager] Google Photos upload failed:`, err.message);
          urls.google = '';
        })
    );
  }

  // 2. MEGA Storage Load-Balancing Uploads
  // Find which MEGA account is active and has enough remaining space
  let chosenMegaKey = null;
  let chosenMegaEmail = null;
  let chosenMegaPassword = null;

  for (const key of ['mega1', 'mega2', 'mega3']) {
    const enabledKey = `${key}Enabled`;
    const emailKey = `${key}Email`;
    const passKey = `${key}Password`;

    if (config[enabledKey] && config[emailKey] && config[passKey]) {
      console.log(`[Storage Balancer] Evaluating capacity for ${key} (${config[emailKey]})...`);
      
      // Get account quota info
      const info = await getMegaAccountInfo(config[emailKey], config[passKey]);
      const remainingBytes = info.spaceTotal - info.spaceUsed;
      
      // If we have enough space (at least 20MB buffer or matching file buffer size)
      if (remainingBytes > fileBuffer.length + (20 * 1024 * 1024)) {
        console.log(`[Storage Balancer] Selected ${key} (${config[emailKey]}) with ${Math.round(remainingBytes / (1024 * 1024))} MB free space.`);
        chosenMegaKey = key;
        chosenMegaEmail = config[emailKey];
        chosenMegaPassword = config[passKey];
        break; // Stop at the first available card (waterfall model)
      } else {
        console.log(`[Storage Balancer] ${key} is full or has insufficient space. Trying next node...`);
      }
    }
  }

  // Fallback to mega1 if nothing else was chosen but it is configured
  if (!chosenMegaKey && config.mega1Enabled && config.mega1Email) {
    console.log(`[Storage Balancer Fallback] No available space on any nodes or offline. Defaulting to mega1.`);
    chosenMegaKey = 'mega1';
    chosenMegaEmail = config.mega1Email;
    chosenMegaPassword = config.mega1Password;
  }

  if (chosenMegaKey) {
    activeClouds.push(chosenMegaKey);
    promises.push(
      uploadToMega(fileBuffer, filename, normalizedCategory, {
        megaEmail: chosenMegaEmail,
        megaPassword: chosenMegaPassword
      })
        .then(url => { 
          urls[chosenMegaKey] = url; 
          urls.mega = url; // Keep for legacy/backward compatibility
        })
        .catch(err => {
          console.error(`[CloudManager] MEGA upload failed on ${chosenMegaKey}:`, err.message);
          urls[chosenMegaKey] = '';
        })
    );
  }

  // 3. Degoo Upload
  if (config.degooEnabled) {
    activeClouds.push('degoo');
    promises.push(
      uploadToDegoo(fileBuffer, filename, mimeType, config)
        .then(url => { urls.degoo = url; })
        .catch(err => {
          console.error(`[CloudManager] Degoo upload failed:`, err.message);
          urls.degoo = '';
        })
    );
  }

  // If no cloud is enabled, default to mock upload in simulation mode on Google/MEGA
  if (activeClouds.length === 0) {
    console.log('[CloudManager] No cloud storages are enabled. Defaulting to Simulation Mode on Google and MEGA.');
    activeClouds.push('google', 'mega1');
    promises.push(
      uploadToGooglePhotos(fileBuffer, filename, mimeType, config).then(url => { urls.google = url; }),
      uploadToMega(fileBuffer, filename, normalizedCategory, { megaEmail: config.mega1Email, megaPassword: config.mega1Password }).then(url => { urls.mega1 = url; urls.mega = url; })
    );
  }

  await Promise.all(promises);
  return { urls, activeClouds };
}

/**
 * Fetch and aggregate media files from all enabled active clouds
 * @returns {Promise<Array>} List of media files
 */
export async function fetchActiveCloudMedia() {
  const config = await getCloudConfig();
  const results = {
    google: [],
    mega1: [],
    mega2: [],
    mega3: [],
    degoo: []
  };
  const promises = [];

  if (config.googlePhotosEnabled) {
    promises.push(
      fetchGooglePhotos(config).then(files => { results.google = files; })
    );
  }

  // Map each MEGA cloud
  for (const key of ['mega1', 'mega2', 'mega3']) {
    const enabledKey = `${key}Enabled`;
    const emailKey = `${key}Email`;
    const passKey = `${key}Password`;

    if (config[enabledKey]) {
      promises.push(
        fetchMega({ megaEmail: config[emailKey], megaPassword: config[passKey] }).then(files => {
          // Adjust file metadata source identifiers so UI understands where it resides
          results[key] = files.map(f => ({ ...f, id: f.id.replace('mega_', `${key}_`), cloud: key }));
        })
      );
    }
  }

  if (config.degooEnabled) {
    promises.push(
      fetchDegoo(config).then(files => { results.degoo = files; })
    );
  }

  // Default simulation scan if nothing enabled
  if (!config.googlePhotosEnabled && !config.mega1Enabled && !config.mega2Enabled && !config.mega3Enabled && !config.degooEnabled) {
    promises.push(
      fetchGooglePhotos(config).then(files => { results.google = files; }),
      fetchMega({ megaEmail: config.mega1Email, megaPassword: config.mega1Password }).then(files => { results.mega1 = files.map(f => ({ ...f, cloud: 'mega1' })); }),
      fetchDegoo(config).then(files => { results.degoo = files; })
    );
  }

  await Promise.all(promises);

  const mergedFiles = [
    ...results.google,
    ...results.mega1,
    ...results.mega2,
    ...results.mega3,
    ...results.degoo
  ];

  mergedFiles.sort((a, b) => new Date(b.date) - new Date(a.date));
  return mergedFiles;
}
