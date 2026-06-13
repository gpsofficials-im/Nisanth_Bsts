import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import 'dotenv/config';

// Import our custom services
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import MediaItem from './models/MediaItem.js';
import ActivityLog from './models/ActivityLog.js';
import { logActivity, getActivities } from './logger.js';
import { sendEmail, getLoginAlertTemplate, getOTPTemplate, getUploadSuccessTemplate, getReminderTemplate, getProfileUpdateTemplate } from './mailer.js';
import { getCloudConfig, updateCloudConfig, uploadToActiveClouds, fetchActiveCloudMedia } from './services/cloudManager.js';
import { getMegaAccountInfo } from './services/mega.js';
import { syncClouds } from './services/syncService.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'nisanth-wallet-ultra-secure-key-2026';

// Enable CORS, Helmet, and JSON parsing
const allowedOrigins = [
  "https://gpsofficials-im.github.io",
  "http://localhost:5173",
  "http://localhost:5000",
  "http://127.0.0.1:5173",
  "https://nisanth-bsts.onrender.com"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    try {
      const hostname = new URL(origin).hostname;
      const isLocal = hostname === 'localhost' ||
                      hostname === '127.0.0.1' ||
                      hostname.startsWith('192.168.') ||
                      hostname.startsWith('10.') ||
                      hostname.startsWith('172.') ||
                      hostname.endsWith('.local') ||
                      /^[0-9.]+$/.test(hostname);
      
      if (allowedOrigins.includes(origin) || isLocal) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } catch (e) {
      callback(e);
    }
  },
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required to allow local media streaming across origins
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API Running Successfully");
});



// Setup Paths
const CONFIG_PATH = path.join(__dirname, 'data', 'config.json');
const MEMORIES_PATH = path.join(__dirname, 'data', 'memories.json');
const CHAT_PATH = path.join(__dirname, 'data', 'chat.json');
const STORAGE_DIR = path.join(__dirname, '..', 'storage');

// Create storage and data folders if not present
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}
// Pre-create basic categorized subdirectories to maintain clean initial structure
const ensureInitialStructure = () => {
  const initialStructure = [
    'photos/fun',
    'photos/letters',
    'photos/photos',
    'videos/camera',
    'videos/edits',
    'videos/extras'
  ];
  initialStructure.forEach(sub => {
    const p = path.join(STORAGE_DIR, ...sub.split('/'));
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  });
};
ensureInitialStructure();
if (!fs.existsSync(path.dirname(CONFIG_PATH))) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
}

// Hash plain text passwords in config on startup
const autoHashPasswords = () => {
  const config = readJsonFile(CONFIG_PATH);
  let updated = false;
  
  if (config.authorizedUsers) {
    config.authorizedUsers = config.authorizedUsers.map(u => {
      // Set default permissions if missing
      if (!u.permissions) {
        u.permissions = { canUpload: true, canDelete: true, canEditTimeline: true };
        updated = true;
      }
      // Hash plain-text password if present
      if (u.password && !u.password.startsWith('$2a$') && !u.password.startsWith('$2b$')) {
        u.password = bcrypt.hashSync(u.password, 10);
        updated = true;
      }
      return u;
    });
  }

  // Seed default quotes list if not exists
  if (!config.quotes || config.quotes.length === 0) {
    config.quotes = [
      "Private memories deserve a private universe.",
      "Two souls. One secure vault.",
      "Moments stay forever inside Nishanth Wallet.",
      "Securing our shared digital lifetime, second by second.",
      "Every screenshot, every laughter, preserved in neon glass."
    ];
    updated = true;
  }

  if (updated) {
    writeJsonFile(CONFIG_PATH, config);
    console.log('[Security] Initialized passwords hashing and default config parameters successfully.');
  }
};

// Write dummy image assets if they don't exist to make placeholders beautiful
const createDummyPlaceholders = () => {
  const dummyFiles = ['first_meet.jpg', 'cafe_chill.jpg', 'beach_trip.mp4'];
  dummyFiles.forEach(file => {
    const filePath = path.join(STORAGE_DIR, file);
    if (!fs.existsSync(filePath)) {
      // Just write a small blank file or mock data
      fs.writeFileSync(filePath, Buffer.alloc(100));
    }
  });
};
createDummyPlaceholders();

// Helper to read and write database files
const readJsonFile = (filePath, fallback = {}) => {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
  }
  return fallback;
};

const saveFrontendCopy = (filename, data) => {
  try {
    const frontendPublicDir = path.join(__dirname, '..', 'frontend', 'public');
    if (fs.existsSync(frontendPublicDir)) {
      const targetPath = path.join(frontendPublicDir, filename);
      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`[Sync] Copied static database ${filename} to frontend/public/ for static deployment.`);
    }
  } catch (err) {
    console.error(`[Sync] Failed to write frontend copy for ${filename}:`, err.message);
  }
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    // Auto-sync copies to frontend public directory for permanent GitHub Pages offline compatibility
    if (filePath.endsWith('memories.json')) {
      saveFrontendCopy('memories.json', data);
    } else if (filePath.endsWith('config.json')) {
      saveFrontendCopy('config.json', data);
    }
    
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
};

const normalizeFolder = (folder, category) => {
  if (!folder) return (category || 'Photos').toLowerCase() === 'videos' ? 'camera' : 'fun';
  const lf = folder.toLowerCase();
  if ((category || 'Photos').toLowerCase() === 'videos') {
    if (lf === 'storage1') return 'camera';
    if (lf === 'storage2') return 'edits';
    if (lf === 'storage3') return 'extras';
  } else {
    if (lf === 'storage1') return 'fun';
    if (lf === 'storage2') return 'letters';
    if (lf === 'storage3') return 'photos';
  }
  return lf;
};

// Configure Multer memory storage (zero local footprint)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max file size
});

// --- SSE CLIENT BROADCASTER ---
let sseClients = [];

app.get('/api/media/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial ping to establish connection
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  sseClients.push(res);
  console.log(`[SSE] Client connected. Total active event clients: ${sseClients.length}`);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
    console.log(`[SSE] Client disconnected. Total active event clients: ${sseClients.length}`);
  });
});

const broadcastSseEvent = (data) => {
  sseClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      // Clean up failed streams dynamically
      sseClients = sseClients.filter(c => c !== client);
    }
  });
};

// --- MULTI-CLOUD STORAGE WALLET SYSTEM ACTIVATED ---
// Filesystem watchers disabled. All data syncs live and streams directly to cloud providers.

// --- BRAND-NEW PREDEFINED SECURE AUTH SYSTEM ("Nisanth Besties") ---

// JWT Verification Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: No session token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    req.user = decoded;
    next();
  });
};

// Session Handshake Verification Route
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  const config = readJsonFile(CONFIG_PATH);
  const matchedUser = config.authorizedUsers.find(u => u.name === req.user.name);
  if (!matchedUser) {
    return res.status(404).json({ error: 'User session invalid. Profile no longer exists.' });
  }
  res.status(200).json({
    success: true,
    user: {
      name: matchedUser.name,
      email: matchedUser.email,
      phone: matchedUser.phone,
      role: matchedUser.role,
      bio: matchedUser.bio,
      relationshipStory: matchedUser.relationshipStory,
      avatar: matchedUser.avatar,
      permissions: matchedUser.permissions || { canUpload: true, canDelete: true, canEditTimeline: true }
    }
  });
});

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50,
  message: { error: 'Too many requests. Please try again after 5 minutes.' }
});

// Phase 1: Login & Send OTP Handler
const handleLoginRequest = async (req, res) => {
  const { identifier, password } = req.body;
  const config = readJsonFile(CONFIG_PATH);
  
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/Mobile and Password are required.' });
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  const rawMobileDigits = identifier.replace(/\D/g, '');

  // Find Gokul or Nivetha by email or mobile digits
  const matchedUser = config.authorizedUsers.find(u => {
    const emailMatch = u.email.toLowerCase() === normalizedIdentifier;
    const storedMobileDigits = (u.mobile || u.phone || '').replace(/\D/g, '');
    const mobileMatch = rawMobileDigits.length >= 10 && (storedMobileDigits.endsWith(rawMobileDigits) || rawMobileDigits.endsWith(storedMobileDigits));
    return emailMatch || mobileMatch;
  });

  if (!matchedUser) {
    console.warn(`[Auth] Rejected invalid credentials for identifier: ${identifier}`);
    return res.status(403).json({ error: 'Access Denied – Invalid credentials.' });
  }

  // Password checks
  const isPassValid = bcrypt.compareSync(password, matchedUser.password);
  if (!isPassValid) {
    console.warn(`[Auth] Rejected incorrect password for user: ${matchedUser.name}`);
    return res.status(403).json({ error: 'Access Denied – Incorrect password.' });
  }

  // Generate secure 6-digit OTP
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

  // Send OTP via SMTP to email only
  try {
    await sendEmail(
      matchedUser.email,
      'Nisanth Besties: Secure Login OTP Code',
      getOTPTemplate(matchedUser.name, generatedOtp, 5)
    );
    console.log(`[Auth] Verification OTP successfully sent to ${matchedUser.email}`);
  } catch (error) {
    console.error('[Auth] SMTP OTP delivery failed:', error.message);
    return res.status(500).json({ error: 'Failed to send OTP via SMTP mailer. Check server connection.' });
  }

  // Create temporary JWT holding the hashed OTP, valid for 5 minutes
  const hashedOtp = bcrypt.hashSync(generatedOtp, 10);
  const tempToken = jwt.sign(
    { name: matchedUser.name, role: matchedUser.role, purpose: 'otp_verification', hashedOtp },
    JWT_SECRET,
    { expiresIn: '5m' }
  );

  return res.status(200).json({
    success: true,
    otpRequired: true,
    tempToken,
    message: 'A secure 6-digit OTP has been sent to your registered email address.'
  });
};

app.post('/api/auth/login', loginLimiter, handleLoginRequest);
app.post('/api/auth/send-otp', loginLimiter, handleLoginRequest);

// Phase 2: Verify OTP Handler
app.post('/api/auth/verify-otp', loginLimiter, async (req, res) => {
  const { tempToken, otp } = req.body;

  if (!tempToken || !otp) {
    return res.status(400).json({ error: 'Verification session and OTP code are required.' });
  }

  try {
    // Verify signature & expiration
    const decoded = jwt.verify(tempToken, JWT_SECRET);

    if (decoded.purpose !== 'otp_verification') {
      return res.status(403).json({ error: 'Invalid verification token.' });
    }

    // Check OTP value
    const isOtpValid = bcrypt.compareSync(otp, decoded.hashedOtp);
    if (!isOtpValid) {
      return res.status(403).json({ error: 'Incorrect OTP code. Please try again.' });
    }

    // Retrieve user profile
    const config = readJsonFile(CONFIG_PATH);
    const matchedUser = config.authorizedUsers.find(u => u.name === decoded.name);

    if (!matchedUser) {
      return res.status(404).json({ error: 'User profile no longer exists.' });
    }

    // Issue 7-day session token
    const token = jwt.sign(
      { name: matchedUser.name, role: matchedUser.role, email: matchedUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    logActivity(matchedUser.name, 'Login', `Logged in via SMTP OTP verification`, 'Success', ip);

    return res.status(200).json({
      success: true,
      token,
      user: {
        name: matchedUser.name,
        email: matchedUser.email,
        phone: matchedUser.phone,
        role: matchedUser.role,
        bio: matchedUser.bio,
        relationshipStory: matchedUser.relationshipStory,
        avatar: matchedUser.avatar,
        permissions: matchedUser.permissions || { canUpload: true, canDelete: true, canEditTimeline: true }
      }
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Verification session expired. Please request a new OTP.' });
    }
    return res.status(403).json({ error: 'Invalid or expired verification session.' });
  }
});

// --- CLOUD AGGREGATOR ROUTER ---
app.get('/api/cloud/files', authenticateToken, async (req, res) => {
  try {
    const files = await fetchActiveCloudMedia();
    res.status(200).json({ success: true, files });
  } catch (error) {
    console.error('[Cloud Route Error] Failed aggregating files:', error);
    res.status(500).json({ error: 'Failed to aggregate files from cloud providers' });
  }
});

// --- MEDIA ROUTER ---


// Serve files securely by redirecting to cloud URL
app.get('/api/media/file/:filename', async (req, res) => {
  const { filename } = req.params;
  
  // Custom smart placeholder images for beautiful aesthetic fallback
  if (filename === 'first_meet.jpg' || filename === 'cafe_chill.jpg' || filename === 'beach_trip.mp4') {
    const localPlaceholder = path.join(__dirname, 'storage', filename);
    if (fs.existsSync(localPlaceholder)) {
      return res.sendFile(localPlaceholder);
    }
  }

  let mediaItem = null;

  // 1. Mongoose MongoDB check
  if (mongoose.connection.readyState === 1) {
    try {
      mediaItem = await MediaItem.findOne({ $or: [{ filename: filename }, { id: filename.split('.')[0] }] });
    } catch (err) {
      console.error('MongoDB query error for file serve:', err);
    }
  }

  // 2. Local database fallback
  if (!mediaItem) {
    const db = readJsonFile(MEMORIES_PATH, { media: [], timeline: [] });
    mediaItem = db.media.find(item => item.filename === filename || item.id === filename.split('.')[0]);
  }
  
  if (mediaItem && mediaItem.urls) {
    const config = await getCloudConfig();
    
    // Redirect to active cloud URL in preferred order: Google -> MEGA1/2/3 -> Degoo
    if (config.googlePhotosEnabled && mediaItem.urls.google) {
      return res.redirect(mediaItem.urls.google);
    }
    if (config.mega1Enabled && mediaItem.urls.mega1) {
      return res.redirect(mediaItem.urls.mega1);
    }
    if (config.mega2Enabled && mediaItem.urls.mega2) {
      return res.redirect(mediaItem.urls.mega2);
    }
    if (config.mega3Enabled && mediaItem.urls.mega3) {
      return res.redirect(mediaItem.urls.mega3);
    }
    if (config.megaEnabled && mediaItem.urls.mega) {
      return res.redirect(mediaItem.urls.mega);
    }
    if (config.degooEnabled && mediaItem.urls.degoo) {
      return res.redirect(mediaItem.urls.degoo);
    }
    
    // Fallback to any URL available on the item
    const fallbackUrl = mediaItem.urls.google || mediaItem.urls.mega1 || mediaItem.urls.mega2 || mediaItem.urls.mega3 || mediaItem.urls.degoo || mediaItem.urls.mega;
    if (fallbackUrl) {
      return res.redirect(fallbackUrl);
    }
  }
  
  // 3. Legacy file check
  const legacyPath = path.join(STORAGE_DIR, filename);
  if (fs.existsSync(legacyPath)) {
    return res.sendFile(legacyPath);
  }

  res.status(404).json({ error: 'File not found on any connected cloud storage' });
});

// Serve placeholders if requested directly
app.get('/api/media/placeholder/:filename', (req, res) => {
  const { filename } = req.params;
  
  // Return some color gradient SVG or cute images as default fallback
  const svgText = `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4f46e5" />
        <stop offset="50%" stop-color="#ec4899" />
        <stop offset="100%" stop-color="#f43f5e" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)" />
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="32" font-weight="bold" fill="white">
      ${filename.replace(/_/g, ' ').replace(/\.[^/.]+$/, '')} 💖
    </text>
  </svg>`;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svgText);
});

// List all media dynamically filtered based on active/enabled clouds
app.get('/api/media', authenticateToken, async (req, res) => {
  const config = await getCloudConfig();

  if (mongoose.connection.readyState === 1) {
    try {
      const anyCloudEnabled = config.googlePhotosEnabled || config.mega1Enabled || config.mega2Enabled || config.mega3Enabled || config.degooEnabled;
      let query = {};
      if (anyCloudEnabled) {
        const orConditions = [];
        if (config.googlePhotosEnabled) orConditions.push({ 'urls.google': { $ne: '' } });
        if (config.mega1Enabled) {
          orConditions.push({ 'urls.mega1': { $ne: '' } });
          orConditions.push({ 'urls.mega': { $ne: '' } });
        }
        if (config.mega2Enabled) orConditions.push({ 'urls.mega2': { $ne: '' } });
        if (config.mega3Enabled) orConditions.push({ 'urls.mega3': { $ne: '' } });
        if (config.degooEnabled) orConditions.push({ 'urls.degoo': { $ne: '' } });
        
        if (orConditions.length > 0) {
          query.$or = orConditions;
        }
      }
      const mediaItems = await MediaItem.find(query).sort({ uploadDate: -1 });
      return res.status(200).json(mediaItems);
    } catch (err) {
      console.error('MongoDB query error on media:', err);
    }
  }

  // Fallback
  const db = readJsonFile(MEMORIES_PATH, { media: [], timeline: [] });
  const anyCloudEnabled = config.googlePhotosEnabled || config.mega1Enabled || config.mega2Enabled || config.mega3Enabled || config.degooEnabled;
  if (!anyCloudEnabled) {
    return res.status(200).json(db.media || []);
  }

  // Filter out media files depending on active clouds
  const filtered = (db.media || []).filter(item => {
    if (item.filename?.startsWith('placeholder_') || item.filename === 'first_meet.jpg' || item.filename === 'cafe_chill.jpg' || item.filename === 'beach_trip.mp4') {
      return true;
    }
    const hasGoogle = config.googlePhotosEnabled && item.urls?.google;
    const hasMega1 = config.mega1Enabled && (item.urls?.mega1 || item.urls?.mega);
    const hasMega2 = config.mega2Enabled && item.urls?.mega2;
    const hasMega3 = config.mega3Enabled && item.urls?.mega3;
    const hasDegoo = config.degooEnabled && item.urls?.degoo;
    return hasGoogle || hasMega1 || hasMega2 || hasMega3 || hasDegoo;
  });

  res.status(200).json(filtered);
});

// Admin-only Storage Settings Config
app.get('/api/admin/storage/config', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Access Denied: Only administrators can view storage settings.' });
  }
  const config = await getCloudConfig();
  res.status(200).json({ success: true, config });
});

app.post('/api/admin/storage/config/update', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Access Denied: Only administrators can update storage settings.' });
  }
  const updated = await updateCloudConfig(req.body);
  broadcastSseEvent({ type: 'refresh' });
  res.status(200).json({ success: true, config: updated });
});

// Admin-only Storage Quotas Stats API
app.get('/api/admin/storage/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Access Denied: Only administrators can view storage statistics.' });
  }

  try {
    const config = await getCloudConfig();
    const stats = {};
    
    // 1. Google storage info
    stats.google = {
      enabled: config.googlePhotosEnabled,
      email: config.googlePhotosEnabled ? 'Google Account Connected' : 'Disconnected',
      spaceUsed: 3221225472, // Mock 3 GB
      spaceTotal: 16106127360, // 15 GB
      status: config.googleAccessToken ? 'Connected' : 'Simulation Mode'
    };

    // 2. MEGA Cloud 1, 2, 3 storage info
    for (const key of ['mega1', 'mega2', 'mega3']) {
      const enabled = config[`${key}Enabled`] || false;
      const email = config[`${key}Email`] || '';
      const password = config[`${key}Password`] || '';
      
      const info = await getMegaAccountInfo(email, password);
      stats[key] = {
        enabled,
        email: email || 'Unconfigured',
        spaceUsed: info.spaceUsed,
        spaceTotal: info.spaceTotal,
        status: enabled ? info.status : 'Disconnected'
      };
    }

    // 3. Degoo storage info
    stats.degoo = {
      enabled: config.degooEnabled,
      email: config.degooAccessToken ? 'Degoo Account Connected' : 'Unconfigured',
      spaceUsed: config.degooAccessToken ? 5368709120 : 0, // Mock 5 GB
      spaceTotal: 107374182400, // 100 GB
      status: config.degooEnabled ? 'Connected' : 'Disconnected'
    };

    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('[Storage Stats Error]:', error.message);
    res.status(500).json({ error: 'Failed to retrieve cloud storage statistics.' });
  }
});

// Upload media files directly to active cloud providers (Zero local disk footprints)
app.post('/api/media/upload', authenticateToken, upload.array('files'), async (req, res) => {
  const { category, folder } = req.body;
  const uploadedBy = req.user.name; // Securely retrieved from verified JWT
  const files = req.files || [];
  
  if (files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const config = await getCloudConfig();
  const db = readJsonFile(MEMORIES_PATH, { media: [], timeline: [] });
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  
  const uploadedItems = [];

  for (const file of files) {
    const fileId = 'media_' + Date.now() + '_' + Math.round(Math.random() * 1000);
    const ext = path.extname(file.originalname).toLowerCase();
    
    // Categorize correctly
    let fileType = 'photo';
    if (['.mp4', '.mov', '.webm', '.avi', '.mkv'].includes(ext)) {
      fileType = 'video';
    } else if (['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt', '.pptx', '.ppt'].includes(ext)) {
      fileType = 'document';
    }

    console.log(`[Cloud Upload] Starting parallel upload for ${file.originalname} (${fileType}) to active clouds...`);
    
    // Call cloud manager parallel uploader
    const { urls, activeClouds } = await uploadToActiveClouds(file.buffer, file.originalname, file.mimetype, category || 'Photos');
    
    const mediaItemData = {
      id: fileId,
      filename: fileId + ext,
      originalName: file.originalname,
      type: fileType,
      category: category || 'Photos',
      folder: folder || 'storage1',
      size: file.size,
      uploadDate: new Date().toISOString(),
      uploadedBy: uploadedBy,
      urls: urls,
      activeClouds: activeClouds,
      tags: [category ? category.toLowerCase() : 'photos', fileType, file.originalname.toLowerCase()]
    };

    // Save to MongoDB if available
    if (mongoose.connection.readyState === 1) {
      try {
        const item = new MediaItem(mediaItemData);
        await item.save();
        await ActivityLog.create({
          user: uploadedBy,
          activityType: 'Upload',
          details: `Uploaded file directly to cloud: ${file.originalname} (${fileType}) to ${category}. Active Clouds: ${activeClouds.join(', ')}`,
          status: 'Success',
          ipAddress: ip
        });
      } catch (err) {
        console.error('MongoDB upload save error:', err);
      }
    }

    // Add to memories fallback database
    db.media.unshift(mediaItemData);
    uploadedItems.push(mediaItemData);
    
    logActivity(
      uploadedBy, 
      'Upload', 
      `Uploaded file directly to cloud: ${file.originalname} (${fileType}) to ${category}. Active Clouds: ${activeClouds.join(', ')}`, 
      'Success', 
      ip
    );
  }

  // Save memories database locally (fallback)
  writeJsonFile(MEMORIES_PATH, db);
  
  // Broadcast live refresh SSE event
  broadcastSseEvent({ type: 'refresh' });

  // Send success response
  res.status(200).json({
    success: true,
    message: 'Files uploaded directly to cloud storage successfully!',
    uploadedItems
  });

  // Send automatic SMTP Nodemailer notification in the background
  try {
    const receiver = config.authorizedUsers?.find(u => u.name !== uploadedBy);
    if (receiver && config.notificationSettings?.uploadSuccess) {
      const emailList = uploadedItems.map(item => ({
        name: item.originalName,
        category: item.category,
        type: item.type
      }));
      
      await sendEmail(
        receiver.email,
        `New Cloud Memories Shared by ${uploadedBy}! 📸`,
        getUploadSuccessTemplate(uploadedBy, emailList)
      );
    }
  } catch (err) {
    console.error('[Mailer] Upload Notification email failed:', err.message);
  }
});

// Delete media
app.delete('/api/media/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userName = req.user.name; // Securely verified from JWT
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  let fileInfo = null;

  // MongoDB check
  if (mongoose.connection.readyState === 1) {
    try {
      fileInfo = await MediaItem.findOne({ $or: [{ id: id }, { _id: mongoose.isValidObjectId(id) ? id : null }] });
      if (fileInfo) {
        await MediaItem.deleteOne({ _id: fileInfo._id });
        await ActivityLog.create({
          user: userName,
          activityType: 'Delete Media',
          details: `Deleted cloud file: ${fileInfo.originalName} from ${fileInfo.category}`,
          status: 'Success',
          ipAddress: ip
        });
        broadcastSseEvent({ type: 'refresh' });
        return res.status(200).json({ success: true, message: 'Media item deleted' });
      }
    } catch (err) {
      console.error('MongoDB delete error:', err);
    }
  }

  // JSON Fallback
  const db = readJsonFile(MEMORIES_PATH, { media: [], timeline: [] });
  const itemIdx = db.media.findIndex(item => item.id === id);
  if (itemIdx === -1) {
    return res.status(404).json({ error: 'Media file not found' });
  }

  fileInfo = db.media[itemIdx];

  // Remove from database list
  db.media.splice(itemIdx, 1);
  writeJsonFile(MEMORIES_PATH, db);

  logActivity(userName, 'Delete Media', `Deleted cloud file: ${fileInfo.originalName} from ${fileInfo.category}`, 'Success', ip);
  broadcastSseEvent({ type: 'refresh' });

  res.status(200).json({ success: true, message: 'Media item deleted' });
});

// --- TIMELINE STORIES ROUTER ---

app.get('/api/timeline', authenticateToken, (req, res) => {
  const db = readJsonFile(MEMORIES_PATH, { media: [], timeline: [] });
  // Sort timeline events chronologically descending
  const sortedTimeline = (db.timeline || []).sort((a, b) => new Date(b.date) - new Date(a.date));
  res.status(200).json(sortedTimeline);
});

app.post('/api/timeline', authenticateToken, (req, res) => {
  const { id, date, title, description, mediaUrls } = req.body;
  const author = req.user.name; // Securely verified from JWT
  const db = readJsonFile(MEMORIES_PATH, { media: [], timeline: [] });
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  if (!date || !title || !description) {
    return res.status(400).json({ error: 'Missing required timeline fields' });
  }

  const timelineEntry = {
    id: id || 'timeline_' + Date.now(),
    date,
    title,
    description,
    mediaUrls: mediaUrls || []
  };

  if (id) {
    // Modify existing card
    const idx = db.timeline.findIndex(t => t.id === id);
    if (idx !== -1) {
      db.timeline[idx] = timelineEntry;
      logActivity(author, 'Edit Timeline', `Updated story card: ${title}`, 'Success', ip);
    } else {
      db.timeline.unshift(timelineEntry);
      logActivity(author, 'Create Timeline', `Created story card: ${title}`, 'Success', ip);
    }
  } else {
    // New card
    db.timeline.unshift(timelineEntry);
    logActivity(author, 'Create Timeline', `Created story card: ${title}`, 'Success', ip);
  }

  writeJsonFile(MEMORIES_PATH, db);
  res.status(200).json({ success: true, timelineEntry });
});

app.delete('/api/timeline/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const author = req.user.name; // Securely verified from JWT
  const db = readJsonFile(MEMORIES_PATH, { media: [], timeline: [] });
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  const idx = db.timeline.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Timeline card not found' });
  }

  const cardTitle = db.timeline[idx].title;
  db.timeline.splice(idx, 1);
  writeJsonFile(MEMORIES_PATH, db);

  logActivity(author, 'Delete Timeline', `Deleted story card: ${cardTitle}`, 'Success', ip);
  res.status(200).json({ success: true, message: 'Timeline story deleted' });
});

// --- ADMIN CONTROL ROUTER ---

// Fetch config (Hiding passwords)
app.get('/api/config', authenticateToken, (req, res) => {
  const config = readJsonFile(CONFIG_PATH);
  
  // Hide credentials for security
  const safeConfig = {
    ...config,
    megaPassword: config.megaPassword ? '••••••••' : '',
    smtpPass: config.smtpPass ? '••••••••' : '',
    geminiApiKey: config.geminiApiKey ? '••••••••' : ''
  };

  res.status(200).json(safeConfig);
});

// Update config
app.post('/api/config/update', authenticateToken, (req, res) => {
  const updates = req.body;
  const ip = req.socket?.remoteAddress || '127.0.0.1';

  // Securely verify admin identity via JWT instead of query param spoofing
  if (req.user.name !== 'Gokul') {
    return res.status(403).json({ error: 'Unauthorized. Admin permissions required.' });
  }

  const config = readJsonFile(CONFIG_PATH);

  // Preserve credentials if user typed dots/placeholders
  const newMegaPassword = updates.megaPassword === '••••••••' ? config.megaPassword : updates.megaPassword;
  const newSmtpPass = updates.smtpPass === '••••••••' ? config.smtpPass : updates.smtpPass;
  const newGeminiApiKey = updates.geminiApiKey === '••••••••' ? config.geminiApiKey : updates.geminiApiKey;

  const newConfig = {
    ...config,
    ...updates,
    megaPassword: newMegaPassword || '',
    smtpPass: newSmtpPass || '',
    geminiApiKey: newGeminiApiKey || ''
  };

  writeJsonFile(CONFIG_PATH, newConfig);
  logActivity('Gokul', 'Admin Change', 'Updated system configurations and storage settings', 'Success', ip);

  res.status(200).json({ success: true, message: 'Configuration saved instantly!' });
});

// Update secondary account access controls
app.post('/api/admin/permissions/update', authenticateToken, (req, res) => {
  const { permissions } = req.body;
  const ip = req.socket?.remoteAddress || '127.0.0.1';

  if (req.user.name !== 'Gokul') {
    return res.status(403).json({ error: 'Unauthorized. Admin permissions required.' });
  }

  const config = readJsonFile(CONFIG_PATH);
  const secUserIdx = config.authorizedUsers.findIndex(u => u.role === 'secondary');
  
  if (secUserIdx !== -1) {
    config.authorizedUsers[secUserIdx].permissions = {
      ...config.authorizedUsers[secUserIdx].permissions,
      ...permissions
    };
    writeJsonFile(CONFIG_PATH, config);
    logActivity('Gokul', 'Permissions Change', `Updated secondary user permissions: ${JSON.stringify(permissions)}`, 'Success', ip);
    res.status(200).json({ success: true, message: 'Permissions updated successfully.' });
  } else {
    res.status(404).json({ error: 'Secondary user not found.' });
  }
});

// Update all credentials (passwords, emails, reset parameters)
app.post('/api/admin/credentials/update', authenticateToken, (req, res) => {
  const { targetUser, email, password } = req.body;
  const ip = req.socket?.remoteAddress || '127.0.0.1';

  if (req.user.name !== 'Gokul') {
    return res.status(403).json({ error: 'Unauthorized. Admin permissions required.' });
  }

  const config = readJsonFile(CONFIG_PATH);
  const userIdx = config.authorizedUsers.findIndex(u => u.name.toLowerCase() === targetUser.toLowerCase());

  if (userIdx === -1) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  if (email) {
    config.authorizedUsers[userIdx].email = email;
  }
  if (password) {
    // Securely hash with bcrypt before writing to config.json
    config.authorizedUsers[userIdx].password = bcrypt.hashSync(password, 10);
  }

  writeJsonFile(CONFIG_PATH, config);
  logActivity('Gokul', 'Credentials Change', `Updated security credentials for ${targetUser}`, 'Success', ip);
  
  res.status(200).json({ success: true, message: 'User credentials modified successfully.' });
});

// Master Edit All Files & Metadata Control
app.post('/api/admin/media/update', authenticateToken, (req, res) => {
  const { id, originalName, tags, category } = req.body;
  const ip = req.socket?.remoteAddress || '127.0.0.1';

  if (req.user.name !== 'Gokul') {
    return res.status(403).json({ error: 'Unauthorized. Admin permissions required.' });
  }

  const db = readJsonFile(MEMORIES_PATH, { media: [], timeline: [] });
  const itemIdx = db.media.findIndex(item => item.id === id);

  if (itemIdx === -1) {
    return res.status(404).json({ error: 'Media file not found.' });
  }

  db.media[itemIdx].originalName = originalName || db.media[itemIdx].originalName;
  db.media[itemIdx].tags = tags || db.media[itemIdx].tags;
  db.media[itemIdx].category = category || db.media[itemIdx].category;

  writeJsonFile(MEMORIES_PATH, db);
  logActivity('Gokul', 'Media Metadata Edit', `Edited metadata for media ID: ${id}`, 'Success', ip);

  res.status(200).json({ success: true, message: 'Media details updated successfully.' });
});

// Admin Quotes control panel
app.post('/api/admin/quotes/update', authenticateToken, (req, res) => {
  const { quotes } = req.body;
  const ip = req.socket?.remoteAddress || '127.0.0.1';

  if (req.user.name !== 'Gokul') {
    return res.status(403).json({ error: 'Unauthorized. Admin permissions required.' });
  }

  const config = readJsonFile(CONFIG_PATH);
  config.quotes = quotes || [];
  writeJsonFile(CONFIG_PATH, config);
  logActivity('Gokul', 'Quotes Edit', 'Updated rotating system quotes list', 'Success', ip);

  res.status(200).json({ success: true, message: 'Rotating quotes saved successfully.' });
});

// Update user details (Profile section)
app.post('/api/profile/update', authenticateToken, async (req, res) => {
  const { targetName, bio, relationshipStory, avatar } = req.body;
  const editorName = req.user.name; // Securely verified from JWT
  const config = readJsonFile(CONFIG_PATH);
  const ip = req.socket?.remoteAddress || '127.0.0.1';

  const userIdx = config.authorizedUsers.findIndex(u => u.name === targetName);
  if (userIdx === -1) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  config.authorizedUsers[userIdx].bio = bio;
  config.authorizedUsers[userIdx].relationshipStory = relationshipStory;
  if (avatar) {
    config.authorizedUsers[userIdx].avatar = avatar; // Persists base64 avatar directly inside config
  }

  writeJsonFile(CONFIG_PATH, config);
  logActivity(editorName, 'Profile Edit', `Edited profile details for ${targetName}`, 'Success', ip);

  // Send automatic SMTP mail warning
  try {
    const targetUser = config.authorizedUsers[userIdx];
    if (config.notificationSettings.profileUpdates) {
      await sendEmail(
        targetUser.email,
        `Your Profile Story Updated! ✨`,
        getProfileUpdateTemplate(targetName, editorName)
      );
    }
  } catch (err) {
    console.error('[Mailer] Profile Update Notification email failed:', err.message);
  }

  res.status(200).json({ success: true, message: 'Profile details modified successfully!' });
});

// Retrieve activity logging
app.get('/api/admin/activities', authenticateToken, (req, res) => {
  if (req.user.name !== 'Gokul') {
    return res.status(403).json({ error: 'Unauthorized access to system logs' });
  }
  
  const activities = getActivities();
  res.status(200).json(activities);
});

// Trigger MEGA synchronization manual route
app.post('/api/admin/sync', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Unauthorized sync control.' });
  }

  res.status(200).json({ success: true, message: 'Multi-MEGA Cloud Sync initiated in background.' });

  // Spawn in background
  (async () => {
    try {
      const syncResult = await syncClouds();
      
      // Broadcast SSE refresh to trigger dynamic gallery reload on the frontend!
      broadcastSseEvent({ type: 'refresh' });
      
      logActivity(
        'System', 
        'Sync', 
        `Completed Cloud Sync cycle. Added: ${syncResult.addedCount}. Updated: ${syncResult.updatedCount}. Errors: ${syncResult.errorCount}`,
        'Success'
      );
    } catch (e) {
      logActivity('System', 'Sync', `Cloud sync failed: ${e.message}`, 'Failed');
    }
  })();
});

// --- FLOATING AI ASSISTANT ROUTER ---

app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  const { message } = req.body;
  const user = req.user.name; // Securely verified from JWT
  const role = req.user.role; // Securely verified from JWT
  const config = readJsonFile(CONFIG_PATH);
  const db = readJsonFile(MEMORIES_PATH, { media: [], timeline: [] });

  const text = message.toLowerCase();

  // Enforce role-based admin check strictly on the backend as well
  if (role === 'secondary') {
    const adminKeywords = ['admin', 'password', 'storage setting', 'credentials', 'permission', 'config', 'smtp', 'mega', 'change email', 'server path', 'cloud', 'wallet', 'vault', 'degoo', 'google photos', 'google drive'];
    const isAccessingAdmin = adminKeywords.some(keyword => text.includes(keyword));
    if (isAccessingAdmin) {
      return res.status(200).json({
        reply: "I'm sorry, Nivetha. As a secondary user, you do not have permission to modify or access admin configurations. Please ask Gokul to perform these actions.",
        suggestions: [
          "When is Nivetha's birthday?",
          "Tell me our anniversary story",
          "Find beach trip memories"
        ]
      });
    }
  }
  
  // Custom Local NLP Semantic Search Rules
  const keywords = {
    birthday: ['birthday', 'born', 'birth', 'cake'],
    anniversary: ['anniversary', 'years', 'months', 'days', 'meet', 'together', 'relation'],
    photos: ['photo', 'photos', 'picture', 'pictures', 'images', 'image'],
    videos: ['video', 'videos', 'clip', 'clips', 'movie'],
    stories: ['story', 'stories', 'timeline', 'milestone', 'moment'],
    gokul: ['gokul', 'him'],
    nivetha: ['nivetha', 'her']
  };

  let searchMatches = [];
  let response = '';

  // 1. Anniversary Date Queries
  if (keywords.anniversary.some(kw => text.includes(kw))) {
    const annivDate = new Date(config.anniversaryDate);
    const today = new Date();
    const diffTime = Math.abs(today - annivDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    response = `💖 Gokul and Nivetha, your special anniversary date is **July 3, 2023**! You two have been inseparable besties for over **${diffDays} days** now! In the timeline, we recorded your first meeting: "${db.timeline.find(t => t.id === 't1')?.description || ''}".`;
  }
  // 2. Birthday Queries
  else if (keywords.birthday.some(kw => text.includes(kw))) {
    if (text.includes('gokul')) {
      response = `🎂 **Gokul's Birthday** is on **January 8**! Be sure to plan a warm tech surprise for him!`;
    } else if (text.includes('nivetha')) {
      response = `🎂 **Nivetha's Birthday** is on **December 2**! Don't forget to prepare a sweet creative card for her!`;
    } else {
      response = `🎂 **Birthdays in our Vault:**\n- Gokul: January 8\n- Nivetha: December 2\nWhich one are we celebrating next?`;
    }
  }
  // 3. Search Media Photos/Videos
  else if (keywords.photos.some(kw => text.includes(kw)) || keywords.videos.some(kw => text.includes(kw))) {
    const targetType = keywords.photos.some(kw => text.includes(kw)) ? 'photo' : 'video';
    
    // Find matching tags
    searchMatches = db.media.filter(m => 
      m.type === targetType && 
      (m.tags.some(tag => text.includes(tag)) || m.originalName.toLowerCase().includes(text))
    );

    if (searchMatches.length > 0) {
      response = `📸 I scanned the vault and found **${searchMatches.length}** relevant ${targetType}s for you! Here are some highlights:\n` +
        searchMatches.map(m => `- **${m.originalName}** (uploaded by ${m.uploadedBy} on ${new Date(m.uploadDate).toLocaleDateString()})`).join('\n');
    } else {
      response = `🔍 I couldn't find any specific ${targetType}s matching your query in the vault. Try searching categories in the Media section!`;
    }
  }
  // 4. Stories & Timeline Cards Lookup
  else if (keywords.stories.some(kw => text.includes(kw)) || text.includes('moment') || text.includes('milestone')) {
    searchMatches = db.timeline.filter(t => 
      t.title.toLowerCase().includes(text) || t.description.toLowerCase().includes(text)
    );

    if (searchMatches.length > 0) {
      response = `📖 I found matching milestone stories in our timeline:\n` +
        searchMatches.map(s => `• **${s.title}** (${s.date}): "${s.description}"`).join('\n');
    } else {
      response = `📖 I searched our Life Story Timeline, but didn't find specific cards matching those words. Go to the Story Timeline to write one down!`;
    }
  }
  // 5. Default smart suggestions
  else {
    response = `✨ Hello **${user || 'Bestie'}**! I am your AI Memory Assistant. 👭\n\nI can scan our private vault. Ask me things like:\n- *"When is Gokul's birthday?"*\n- *"Tell me our anniversary story"* \n- *"Find photos from the beach"* \n- *"Show timeline memories"*`;
  }

  res.status(200).json({
    reply: response,
    suggestions: [
      "When is Nivetha's birthday?",
      "Tell me our anniversary story",
      "Find beach trip memories",
      "Show timeline stories"
    ]
  });
});

// --- SCHEDULER & EMAIL CHECKERS ---
// Run a background interval checking every 12 hours for event countdown alerts
const startEventReminderScheduler = () => {
  console.log('[Scheduler] Initializing Anniversary & Birthday alarm checker...');
  
  const checkInterval = 12 * 60 * 60 * 1000; // 12 hours
  
  setInterval(async () => {
    try {
      const config = readJsonFile(CONFIG_PATH);
      if (config.sandboxMode) return;

      const today = new Date();
      const currentMonth = today.getMonth() + 1; // 1-12
      const currentDate = today.getDate(); // 1-31
      
      const birthdays = config.birthdays;
      
      // Gokul Birthday Check (Jan 8)
      if (currentMonth === 1 && currentDate === 7) {
        // Send email 1 day before
        const target = config.authorizedUsers.find(u => u.name === 'Nivetha');
        if (target) {
          await sendEmail(
            target.email,
            "Birthday Alert: Gokul's Birthday is tomorrow! 🎂",
            getReminderTemplate("Gokul's Birthday", 1, "24 Hours Remaining")
          );
        }
      }

      // Nivetha Birthday Check (Dec 2)
      if (currentMonth === 12 && currentDate === 1) {
        // Send email 1 day before
        const target = config.authorizedUsers.find(u => u.name === 'Gokul');
        if (target) {
          await sendEmail(
            target.email,
            "Birthday Alert: Nivetha's Birthday is tomorrow! 🎂",
            getReminderTemplate("Nivetha's Birthday", 1, "24 Hours Remaining")
          );
        }
      }

      // Anniversary Check (July 3)
      if (currentMonth === 7 && currentDate === 2) {
        for (const user of config.authorizedUsers) {
          await sendEmail(
            user.email,
            "Anniversary Alert: Besties Anniversary is tomorrow! 💖",
            getReminderTemplate("Besties Anniversary", 1, "24 Hours Remaining")
          );
        }
      }
    } catch (err) {
      console.error('[Scheduler] Error checking scheduled dates:', err.message);
    }
  }, checkInterval);
};
startEventReminderScheduler();

// Start background Cloud Sync Worker
const startBackgroundCloudSync = async () => {
  const config = readJsonFile(CONFIG_PATH);
  const interval = config.megaSyncInterval || 300000; // 5 minutes default
  console.log(`[Cloud Sync Scheduler] Initialized background worker. Frequency: ${interval / 60000} mins`);
  
  // Run once immediately on server boot with a 10s delay to let server settle
  setTimeout(async () => {
    console.log('[Cloud Sync Scheduler] Running initial boot sync cycle...');
    try {
      await syncClouds();
    } catch (e) {
      console.error('[Cloud Sync Scheduler] Boot sync failed:', e.message);
    }
  }, 10000);

  setInterval(async () => {
    console.log('[Cloud Sync Scheduler] Running routine sync cycle...');
    try {
      await syncClouds();
    } catch (e) {
      console.error('[Cloud Sync Scheduler] Background sync failed:', e.message);
    }
  }, interval);
};
startBackgroundCloudSync();

// Socket.IO Real-time Chat handlers
io.on('connection', (socket) => {
  console.log('[Socket] A user connected to Nisanth Wallet Chat:', socket.id);
  
  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`[Socket] User joined room: ${roomName}`);
  });
  
  socket.on('fetch_chat_history', () => {
    const chatDb = readJsonFile(CHAT_PATH, { messages: [] });
    socket.emit('chat_history', chatDb.messages);
  });

  socket.on('send_message', (msgData) => {
    const chatDb = readJsonFile(CHAT_PATH, { messages: [] });
    const newMsg = {
      id: msgData.id || 'msg_' + Date.now(),
      sender: msgData.sender,
      recipient: msgData.recipient,
      text: msgData.text,
      timestamp: msgData.timestamp || new Date().toISOString(),
      read: false
    };
    chatDb.messages.push(newMsg);
    writeJsonFile(CHAT_PATH, chatDb);

    // Emit to rooms
    io.to(`room_${msgData.recipient}`).emit('new_message', newMsg);
    io.to(`room_${msgData.sender}`).emit('new_message', newMsg);
  });

  socket.on('mark_as_read', (data) => {
    const chatDb = readJsonFile(CHAT_PATH, { messages: [] });
    let updated = false;
    chatDb.messages.forEach(msg => {
      if (msg.recipient === data.reader && msg.sender === data.sender && !msg.read) {
        msg.read = true;
        updated = true;
      }
    });
    if (updated) {
      writeJsonFile(CHAT_PATH, chatDb);
      io.to(`room_${data.sender}`).emit('messages_read_receipt', { reader: data.reader, sender: data.sender });
    }
  });

  socket.on('disconnect', () => {
    console.log('[Socket] User disconnected:', socket.id);
  });
});

// Start the server
httpServer.listen(PORT, async () => {
  console.log(`=================================================`);
  console.log(`🚀 NISANTH VAULT BACKEND RUNNING ON PORT ${PORT}`);
  console.log(`📂 LOCAL STORAGE VAULT PATH: ${STORAGE_DIR}`);
  console.log(`🔐 SANDBOX AUTHENTICATION ENABLED BY DEFAULT`);
  console.log(`=================================================`);
  
  // Initialize Database connection on boot
  await connectDB();

  // Hash configuration passwords on boot
  autoHashPasswords();

  // Generate and log Google Photos OAuth URL automatically on boot for easy admin setup!
  try {
    const configData = readJsonFile(CONFIG_PATH);
    const clientId = configData.googleClientId || process.env.GOOGLE_CLIENT_ID;
    if (clientId) {
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id: clientId,
        redirect_uri: 'http://localhost:5000/api/auth/google/callback',
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/photoslibrary.appendonly',
        access_type: 'offline',
        prompt: 'consent'
      }).toString();
      console.log(`\n=================================================`);
      console.log(`🔑 GOOGLE PHOTOS OAUTH LOGIN URL FOR ADMIN:`);
      console.log(`Open this URL in your browser to authorize Google Photos:`);
      console.log(`Open this URL: ${oauthUrl}`);
      console.log(`=================================================\n`);
    }
  } catch (err) {
    console.error('[OAuth Boot Logger] Could not generate Google OAuth URL:', err.message);
  }
});
