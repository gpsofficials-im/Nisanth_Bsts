import mongoose from 'mongoose';

const CloudAccountSchema = new mongoose.Schema({
  provider: { type: String, enum: ['google', 'mega', 'mega1', 'mega2', 'mega3', 'degoo'], required: true },
  accountEmail: { type: String, required: true },
  displayName: { type: String, default: 'Primary Cloud' },
  isActive: { type: Boolean, default: true },
  credentials: {
    accessToken: { type: String, default: '' },
    refreshToken: { type: String, default: '' },
    expiryDate: { type: Date },
    appPassword: { type: String, default: '' }, // For MEGA / custom app password integrations
    clientId: { type: String, default: '' },
    clientSecret: { type: String, default: '' }
  },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('CloudAccount', CloudAccountSchema);
