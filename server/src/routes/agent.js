import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { triageTicket } from '../services/agentService.js';

export const agent = Router();

const triageSchema = Joi.object({
  body: Joi.object({
    ticketId: Joi.string().hex().length(24).required(),
    traceId: Joi.string().required()
  })
});

// internal endpoint to trigger triage (called after ticket creation)
agent.post('/triage', requireAuth, requireRole('admin', 'agent', 'user'), validate(triageSchema), async (req, res, next) => {
  try {
    const { ticketId, traceId } = req.body;
    const result = await triageTicket({ ticketId, traceId });
    res.json(result);
  } catch (e) { 
    next(e); 
  }
});
