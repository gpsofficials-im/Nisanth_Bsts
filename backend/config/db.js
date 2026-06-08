import mongoose from 'mongoose';
import 'dotenv/config';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nisanth-wallet';

export async function connectDB() {
  try {
    console.log(`[Database] Attempting connection to MongoDB: ${MONGO_URI.split('@').pop()}...`);
    
    // Configure mongoose options for smooth connections
    mongoose.set('strictQuery', false);
    
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000 // Timeout after 5 seconds to prevent hung bootups
    });

    console.log('[Database] Connected successfully to MongoDB instance!');
    return true;
  } catch (error) {
    console.warn(`[Database Warnings] MongoDB connection failed: ${error.message}`);
    console.log('[Database] Activating Lightweight virtual memory model fallback for stability.');
    return false;
  }
}
