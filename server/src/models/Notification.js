import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['ticket_created', 'ticket_assigned', 'ticket_replied', 'ticket_closed', 'ticket_auto_resolved', 'ticket_resolved'], 
    required: true 
  },
  message: { type: String, required: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Index for efficient querying
schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, read: 1 });
schema.index({ ticketId: 1 });

export const Notification = mongoose.model('Notification', schema);
