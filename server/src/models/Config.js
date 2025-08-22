import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  autoCloseEnabled: { type: Boolean, default: true },
  confidenceThreshold: { type: Number, default: 0.78 },
  slaHours: { type: Number, default: 24 }
});

export const Config = mongoose.model('Config', schema);
