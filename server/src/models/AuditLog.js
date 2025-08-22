import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', index: true },
  traceId: { type: String, index: true },
  actor: { type: String, enum: ['system', 'agent', 'user'], required: true },
  action: { type: String, required: true },
  meta: { type: Object, default: {} },
  timestamp: { type: Date, default: () => new Date(), index: true }
});

export const AuditLog = mongoose.model('AuditLog', schema);
