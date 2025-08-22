import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { triageTicket } from '../services/agentService.js';
import { Ticket } from '../models/Ticket.js';
import { AgentSuggestion } from '../models/AgentSuggestion.js';
import { AuditLog } from '../models/AuditLog.js';
import { TicketReply } from '../models/TicketReply.js';
import { Article } from '../models/Article.js';
import { User } from '../models/User.js';
import { newTraceId } from '../utils/trace.js';
import { emitNotification } from '../services/notificationService.js';

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

// Get agent dashboard with pending tickets and suggested replies
agent.get('/dashboard', requireAuth, requireRole('agent'), async (req, res, next) => {
  try {
    // Get tickets that need agent attention
    const pendingTickets = await Ticket.find({
      status: { $in: ['waiting_human', 'open'] }
    })
    .populate('agentSuggestionId')
    .populate('createdBy', 'name email')
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

    // Transform for frontend
    const ticketsWithSuggestions = pendingTickets.map(ticket => {
      if (ticket.agentSuggestionId) {
        ticket.agentSuggestion = {
          predictedCategory: ticket.agentSuggestionId.predictedCategory,
          confidence: ticket.agentSuggestionId.confidence,
          draftReply: ticket.agentSuggestionId.draftReply,
          kbCitations: ticket.agentSuggestionId.articleIds || [],
          autoClosed: ticket.agentSuggestionId.autoClosed || false
        };
        delete ticket.agentSuggestionId;
      }
      return ticket;
    });

    res.json({
      pendingTickets: ticketsWithSuggestions,
      totalPending: ticketsWithSuggestions.length
    });
  } catch (e) {
    next(e);
  }
});

// Get detailed ticket information with KB citations
const ticketDetailSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().hex().length(24).required()
  })
});

agent.get('/tickets/:id', requireAuth, requireRole('agent'), validate(ticketDetailSchema), async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('agentSuggestionId')
      .populate('createdBy', 'name email')
      .lean();

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Get KB articles referenced in the suggestion
    let kbArticles = [];
    if (ticket.agentSuggestionId && ticket.agentSuggestionId.articleIds) {
      kbArticles = await Article.find({
        _id: { $in: ticket.agentSuggestionId.articleIds }
      }).select('title body tags category').lean();
    }

    // Get ticket replies
    const replies = await TicketReply.find({ ticketId: ticket._id })
      .populate('author', 'name email role')
      .sort({ createdAt: 1 })
      .lean();

    // Transform agent suggestion data
    if (ticket.agentSuggestionId) {
      ticket.agentSuggestion = {
        predictedCategory: ticket.agentSuggestionId.predictedCategory,
        confidence: ticket.agentSuggestionId.confidence,
        draftReply: ticket.agentSuggestionId.draftReply,
        kbCitations: ticket.agentSuggestionId.articleIds || [],
        autoClosed: ticket.agentSuggestionId.autoClosed || false,
        qualityMetrics: ticket.agentSuggestionId.qualityMetrics || {}
      };
      delete ticket.agentSuggestionId;
    }

    res.json({
      ticket,
      kbArticles,
      replies,
      hasAISuggestion: !!ticket.agentSuggestion
    });
  } catch (e) {
    next(e);
  }
});

// Draft a custom reply with KB citations
const draftReplySchema = Joi.object({
  body: Joi.object({
    ticketId: Joi.string().hex().length(24).required(),
    content: Joi.string().min(10).max(5000).required(),
    kbArticleIds: Joi.array().items(Joi.string().hex().length(24)).default([]),
    isInternal: Joi.boolean().default(false)
  })
});

agent.post('/draft-reply', requireAuth, requireRole('agent'), validate(draftReplySchema), async (req, res, next) => {
  try {
    const { ticketId, content, kbArticleIds, isInternal } = req.body;

    const ticket = await Ticket.findById(ticketId).populate('createdBy');
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Get KB articles for citations
    let kbArticles = [];
    if (kbArticleIds.length > 0) {
      kbArticles = await Article.find({
        _id: { $in: kbArticleIds }
      }).select('title body tags category').lean();
    }

    // Create draft reply (not sent yet)
    const draft = {
      ticketId,
      content,
      kbCitations: kbArticles,
      citationIds: kbArticleIds,
      isInternal,
      draftedBy: req.user._id,
      draftedAt: new Date()
    };

    res.json({
      success: true,
      draft,
      message: 'Draft reply created with KB citations'
    });
  } catch (e) {
    next(e);
  }
});

// Send reply with citations
const sendReplySchema = Joi.object({
  body: Joi.object({
    ticketId: Joi.string().hex().length(24).required(),
    content: Joi.string().min(1).max(5000).required(),
    kbArticleIds: Joi.array().items(Joi.string().hex().length(24)).default([]),
    isInternal: Joi.boolean().default(false),
    closeTicket: Joi.boolean().default(false)
  })
});

agent.post('/send-reply', requireAuth, requireRole('agent'), validate(sendReplySchema), async (req, res, next) => {
  try {
    const { ticketId, content, kbArticleIds, isInternal, closeTicket } = req.body;
    const traceId = newTraceId();

    const ticket = await Ticket.findById(ticketId).populate('createdBy');
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Create the reply with KB citations
    const reply = await TicketReply.create({
      ticketId,
      content,
      author: req.user._id,
      authorType: 'agent',
      isInternal,
      citations: kbArticleIds,
      traceId
    });

    // Update ticket status
    const oldStatus = ticket.status;
    ticket.status = closeTicket ? 'resolved' : 'open';
    await ticket.save();

    // Create audit log for status change if closing ticket
    if (closeTicket) {
      await AuditLog.create({
        ticketId,
        traceId,
        actor: 'agent',
        action: 'TICKET_RESOLVED_WITH_REPLY',
        meta: {
          replyId: String(reply._id),
          agentId: req.user._id,
          agentName: req.user.name,
          oldStatus,
          newStatus: 'resolved',
          citations: kbArticleIds.length,
          isInternal
        },
        timestamp: new Date()
      });
    }

    // Send notification to customer (if not internal)
    if (!isInternal) {
      const notificationType = closeTicket ? 'ticket_resolved' : 'ticket_replied';
      const message = closeTicket 
        ? `Your ticket "${ticket.title}" has been resolved.`
        : `You have a new reply on your ticket "${ticket.title}".`;

      await emitNotification({
        userId: ticket.createdBy._id.toString(),
        type: notificationType,
        message,
        ticketId: ticket._id.toString(),
        metadata: {
          traceId,
          agentId: req.user._id.toString(),
          oldStatus,
          newStatus: ticket.status,
          hasReply: true,
          citations: kbArticleIds.length
        }
      });
    }

    // Get KB articles for response
    const kbArticles = kbArticleIds.length > 0 
      ? await Article.find({ _id: { $in: kbArticleIds } }).select('title body tags').lean()
      : [];

    res.json({
      success: true,
      reply: await TicketReply.findById(reply._id).populate('author', 'name email role').lean(),
      kbArticles,
      ticketStatus: ticket.status,
      message: closeTicket ? 'Reply sent and ticket closed' : 'Reply sent successfully'
    });
  } catch (e) {
    next(e);
  }
});

// Get available KB articles for citations
agent.get('/kb-articles', requireAuth, requireRole('agent'), async (req, res, next) => {
  try {
    const search = req.query.search || '';
    const category = req.query.category;
    
    let query = { status: 'published' };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (category) {
      query.category = category;
    }

    const articles = await Article.find(query)
      .select('title body tags category createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      articles,
      total: articles.length
    });
  } catch (e) {
    next(e);
  }
});
