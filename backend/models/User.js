import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  password: { type: String, required: true }, // BCrypt hash
  role: { type: String, enum: ['owner', 'secondary'], default: 'secondary' },
  bio: { type: String, default: '' },
  relationshipStory: { type: String, default: '' },
  avatar: { type: String, default: '' },
  permissions: {
    canUpload: { type: Boolean, default: true },
    canDelete: { type: Boolean, default: true },
    canEditTimeline: { type: Boolean, default: true }
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
