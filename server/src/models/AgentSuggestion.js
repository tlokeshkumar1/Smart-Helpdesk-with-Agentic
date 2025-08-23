import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', index: true },
  predictedCategory: { type: String, enum: ['billing', 'tech', 'shipping', 'other'], required: true },
  articleIds: { type: [String], default: [] },
  draftReply: { type: String, required: true },
  confidence: { type: Number, required: true },
  originalConfidence: { type: Number }, // Original confidence before adjustments
  autoClosed: { type: Boolean, default: false },
  reviewed: { type: Boolean, default: false }, // Whether the suggestion has been reviewed by an agent
  reviewResult: { type: String, enum: ['accepted', 'edited', 'rejected'], default: null }, // Result of the review
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Agent who reviewed
  reviewedAt: { type: Date, default: null }, // When it was reviewed
  modelInfo: {
    provider: String,
    model: String,
    promptVersion: String,
    latencyMs: Number,
    stubMode: Boolean,
    totalProcessingTimeMs: Number,
    attempt: Number,
    totalAttempts: Number
  },
  qualityMetrics: {
    retrievalQuality: Number,      // How well KB articles matched
    citationCount: Number,         // Number of citations in response
    responseLength: Number         // Length of generated response
  },
  reasoning: String,               // AI reasoning for classification (if available)
  createdAt: { type: Date, default: () => new Date() }
});

export const AgentSuggestion = mongoose.model('AgentSuggestion', schema);
