import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { Article } from '../models/Article.js';
import { searchKB } from '../services/kbService.js';

export const kb = Router();

// Transform MongoDB document to API format
function transformArticle(doc) {
  if (!doc) return null;
  const article = doc.toObject ? doc.toObject() : doc;
  return {
    id: article._id.toString(),
    title: article.title,
    body: article.body,
    tags: article.tags || [],
    status: article.status,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt
  };
}

const idSchema = Joi.object({ 
  params: Joi.object({ 
    id: Joi.string().hex().length(24).required() 
  }) 
});

kb.get('/', requireAuth, async (req, res, next) => {
  try {
    const q = req.query.query || '';
    const items = await searchKB(q);
    res.json(items);
  } catch (e) { 
    next(e); 
  }
});

kb.get('/:id', requireAuth, validate(idSchema), async (req, res, next) => {
  try {
    const doc = await Article.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Article not found' });
    res.json(transformArticle(doc));
  } catch (e) { 
    next(e); 
  }
});

const createSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().required(),
    body: Joi.string().required(),
    tags: Joi.array().items(Joi.string()).default([]),
    status: Joi.string().valid('unpublish', 'publish', 'published').default('unpublish')
  })
});

const updateSchema = Joi.object({
  params: Joi.object({ 
    id: Joi.string().hex().length(24).required() 
  }),
  body: Joi.object({
    title: Joi.string(),
    body: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    status: Joi.string().valid('unpublish', 'publish', 'published')
  }).min(1)
});

kb.post('/', requireAuth, requireRole('admin'), validate(createSchema), async (req, res, next) => {
  try {
    const doc = await Article.create(req.body);
    res.status(201).json(transformArticle(doc));
  } catch (e) { 
    next(e); 
  }
});

kb.put('/:id', requireAuth, requireRole('admin'), validate(updateSchema), async (req, res, next) => {
  try {
    const doc = await Article.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, updatedAt: new Date() }, 
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Article not found' });
    res.json(transformArticle(doc));
  } catch (e) { 
    next(e); 
  }
});

kb.delete('/:id', requireAuth, requireRole('admin'), validate(idSchema), async (req, res, next) => {
  try {
    const doc = await Article.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Article not found' });
    res.json({ ok: true });
  } catch (e) { 
    next(e); 
  }
});

// Toggle publish/unpublish status
kb.patch('/:id/toggle-status', requireAuth, requireRole('admin'), validate(idSchema), async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    
    const newStatus = article.status === 'publish' || article.status === 'published' ? 'unpublish' : 'published';
    const doc = await Article.findByIdAndUpdate(
      req.params.id, 
      { status: newStatus, updatedAt: new Date() }, 
      { new: true }
    );
    
    res.json(transformArticle(doc));
  } catch (e) { 
    next(e); 
  }
});
