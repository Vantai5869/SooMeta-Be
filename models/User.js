import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  deviceId: { type: String, required: true },
  platform: { type: String, enum: ['iOS', 'Android'], required: true },
  createdAt: { type: Date, default: Date.now },
  role: { type: String, default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null }
});

export default mongoose.model('user', userSchema)