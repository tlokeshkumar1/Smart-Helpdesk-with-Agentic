import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  title: { type: String, required: true, index: 'text' },
  body: { type: String, required: true },
  tags: { type: [String], default: [], index: true },
  status: { type: String, enum: ['unpublish', 'publish', 'published'], default: 'unpublish', index: true },
  updatedAt: { type: Date, default: () => new Date() }
});

export const Article = mongoose.model('Article', schema);
