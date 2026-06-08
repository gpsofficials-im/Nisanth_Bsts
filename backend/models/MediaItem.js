import mongoose from 'mongoose';

const MediaItemSchema = new mongoose.Schema({
  filename: { type: String, required: true, unique: true },
  originalName: { type: String, required: true },
  type: { type: String, enum: ['photo', 'video', 'document'], required: true },
  category: { type: String, default: 'Photos' }, // Photos, Videos, Documents
  folder: { type: String, default: 'storage1' }, // fun/camera/notes etc.
  size: { type: Number, required: true },
  uploadDate: { type: Date, default: Date.now },
  uploadedBy: { type: String, required: true },
  urls: {
    google: { type: String, default: '' },
    mega: { type: String, default: '' },
    mega1: { type: String, default: '' },
    mega2: { type: String, default: '' },
    mega3: { type: String, default: '' },
    degoo: { type: String, default: '' }
  },
  activeClouds: [{ type: String, enum: ['google', 'mega', 'mega1', 'mega2', 'mega3', 'degoo'] }],
  tags: [{ type: String }]
});

export default mongoose.model('MediaItem', MediaItemSchema);
