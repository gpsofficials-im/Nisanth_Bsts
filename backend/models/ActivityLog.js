import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  user: { type: String, required: true },
  activityType: { type: String, required: true }, // e.g. Upload, Delete, Login, Sync
  details: { type: String, default: '' },
  status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
  ipAddress: { type: String, default: '127.0.0.1' }
});

export default mongoose.model('ActivityLog', ActivityLogSchema);
