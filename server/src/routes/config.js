import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { Config } from '../models/Config.js';
import { validate } from '../middleware/validate.js';

export const cfg = Router();

cfg.get('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const doc = await (Config.findOne() || new Config({}).save());
    res.json(doc);
  } catch (e) { 
    next(e); 
  }
});

const upSchema = Joi.object({
  body: Joi.object({
    autoCloseEnabled: Joi.boolean(),
    confidenceThreshold: Joi.number().min(0).max(1),
    slaHours: Joi.number().min(1)
  })
});

cfg.put('/', requireAuth, requireRole('admin'), validate(upSchema), async (req, res, next) => {
  try {
    const doc = await Config.findOne();
    const current = doc || new Config({});
    Object.assign(current, req.body);
    await current.save();
    res.json(current);
  } catch (e) { 
    next(e); 
  }
});
