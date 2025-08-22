import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import Joi from 'joi';
import { validate } from '../middleware/validate.js';
import { AuditLog } from '../models/AuditLog.js';

export const audit = Router();

const idSchema = Joi.object({ 
  params: Joi.object({ 
    id: Joi.string().hex().length(24).required() 
  }) 
});

audit.get('/tickets/:id/audit', requireAuth, validate(idSchema), async (req, res, next) => {
  try {
    const items = await AuditLog.find({ ticketId: req.params.id })
      .sort({ timestamp: 1 })
      .lean();
    res.json(items);
  } catch (e) { 
    next(e); 
  }
});
