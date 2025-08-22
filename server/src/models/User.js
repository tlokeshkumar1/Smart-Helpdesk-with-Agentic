import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const schema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, index: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'agent', 'user'], default: 'user', index: true },
  createdAt: { type: Date, default: () => new Date() }
});

schema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

schema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

export const User = mongoose.model('User', schema);
