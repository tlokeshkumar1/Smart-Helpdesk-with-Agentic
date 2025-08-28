import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['billing', 'tech', 'shipping', 'other'], default: 'other', index: true },
  customCategory: { type: String },
  status: { type: String, enum: ['open', 'triaged', 'waiting_human', 'resolved', 'closed'], default: 'open', index: true },
  attachments: [{ type: String }], // Array of URLs
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  agentSuggestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentSuggestion' },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

export const Ticket = mongoose.model('Ticket', schema);
