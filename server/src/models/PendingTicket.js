import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
  agentId: { type: String, required: true, index: true }, // Agent ID from the AI system
  agentName: { type: String, required: true },
  action: { type: String, enum: ['accept', 'reject'], required: true },
  originalReply: { type: String, required: true },
  confidence: { type: Number, required: true },
  willSendImmediately: { type: Boolean, default: false },
  willCloseTicket: { type: Boolean, default: false },
  status: { type: [String], enum: ['pending', 'accepted', 'rejected', 'closed'], default: ['pending'], index: true },
  traceId: { type: String, required: true, index: true },
  auditLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'AuditLog', index: true },
  assignedAt: { type: Date, default: () => new Date() },
  respondedAt: { type: Date },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

// Index for efficient querying by agent and status
schema.index({ agentId: 1, status: 1 });
schema.index({ ticketId: 1, status: 1 });

export const PendingTicket = mongoose.model('PendingTicket', schema);
