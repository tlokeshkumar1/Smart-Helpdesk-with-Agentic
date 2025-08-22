import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { TicketReply } from '../models/TicketReply.js';
import { Ticket } from '../models/Ticket.js';

export const replies = Router();

const createReplySchema = Joi.object({
  body: Joi.object({
    ticketId: Joi.string().hex().length(24).required(),
    content: Joi.string().min(1).max(5000).required(),
    isInternal: Joi.boolean().default(false),
    attachments: Joi.array().items(Joi.string()).default([])
  })
});

const getTicketRepliesSchema = Joi.object({
  params: Joi.object({
    ticketId: Joi.string().hex().length(24).required()
  })
});

// Get all replies for a ticket
replies.get('/ticket/:ticketId', requireAuth, validate(getTicketRepliesSchema), async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    
    // Verify ticket exists and user has access
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check if user has access to this ticket (owner, assignee, or admin/agent)
    const hasAccess = ticket.createdBy.equals(req.user._id) || 
                     (ticket.assignee && ticket.assignee.equals(req.user._id)) ||
                     ['admin', 'agent'].includes(req.user.role);
                     
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get replies with author information
    const replies = await TicketReply.find({ ticketId })
      .populate('author', 'name email role')
      .populate('agentSuggestionId', 'confidence predictedCategory')
      .sort({ createdAt: 1 })
      .lean();
    
    // Filter internal replies for non-admin/agent users
    const filteredReplies = ['admin', 'agent'].includes(req.user.role) 
      ? replies 
      : replies.filter(reply => !reply.isInternal);
    
    res.json({
      ticketId,
      replies: filteredReplies,
      totalReplies: filteredReplies.length
    });
  } catch (error) {
    next(error);
  }
});

// Create a new reply
replies.post('/', requireAuth, validate(createReplySchema), async (req, res, next) => {
  try {
    const { ticketId, content, isInternal, attachments } = req.body;
    
    // Verify ticket exists and user has access
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check if user has access to reply to this ticket
    const hasAccess = ticket.createdBy.equals(req.user._id) || 
                     (ticket.assignee && ticket.assignee.equals(req.user._id)) ||
                     ['admin', 'agent'].includes(req.user.role);
                     
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Only admin/agent can create internal replies
    if (isInternal && !['admin', 'agent'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Cannot create internal replies' });
    }
    
    // Create the reply
    const reply = await TicketReply.create({
      ticketId,
      content,
      author: req.user._id,
      authorType: 'user',
      isInternal,
      attachments,
      citations: []
    });
    
    // Update ticket status if it was resolved and customer replies
    if (ticket.status === 'resolved' && req.user._id.equals(ticket.createdBy)) {
      ticket.status = 'open';
      await ticket.save();
    }
    
    // Populate author information for response
    await reply.populate('author', 'name email role');
    
    res.status(201).json({
      reply: reply.toObject(),
      ticketStatusUpdated: ticket.status === 'open'
    });
  } catch (error) {
    next(error);
  }
});

export default replies;
