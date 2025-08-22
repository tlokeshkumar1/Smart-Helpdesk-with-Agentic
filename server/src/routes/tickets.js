import { Router } from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { Ticket } from '../models/Ticket.js';
import { AgentSuggestion } from '../models/AgentSuggestion.js';
import { AuditLog } from '../models/AuditLog.js';
import { TicketReply } from '../models/TicketReply.js';
import { User } from '../models/User.js';
import { newTraceId } from '../utils/trace.js';
import { triageTicket } from '../services/agentService.js';
import { emitNotification } from '../services/notificationService.js';

export const tickets = Router();

const createSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().min(3).required(),
    description: Joi.string().min(5).required(),
    category: Joi.string().valid('billing', 'tech', 'shipping', 'other').default('other'),
    attachments: Joi.array().items(Joi.string().uri()).default([])
  })
});

tickets.post('/', requireAuth, requireRole('user'), validate(createSchema), async (req, res, next) => {
  try {
    const traceId = newTraceId();
    const ticket = await Ticket.create({
      title: req.body.title,
      description: req.body.description,
      category: req.body.category || 'other',
      attachments: req.body.attachments || [],
      createdBy: req.user._id
    });

    await AuditLog.create({ 
      ticketId: ticket._id, 
      traceId, 
      actor: 'user', 
      action: 'TICKET_CREATED', 
      meta: { 
        attachments: req.body.attachments || [],
        category: ticket.category
      }, 
      timestamp: new Date() 
    });

    // Send notification to user
    await emitNotification({
      userId: req.user._id.toString(),
      type: 'ticket_created',
      message: `Your ticket "${ticket.title}" has been created and is being processed.`,
      ticketId: ticket._id.toString(),
      metadata: { traceId, status: 'open' }
    });

    // Notify all agents about new ticket (excluding admin users)
    const agents = await User.find({ role: 'agent' });
    for (const agent of agents) {
      await emitNotification({
        userId: agent._id.toString(),
        type: 'ticket_created',
        message: `New ticket "${ticket.title}" requires attention.`,
        ticketId: ticket._id.toString(),
        metadata: { traceId, category: ticket.category, createdBy: req.user.email }
      });
    }

    // trigger agent triage inline with retry & timeout handled in service
    const triageResult = await triageTicket({ ticketId: ticket._id, traceId });

    // If auto-resolved, send notification to user about the resolution
    if (triageResult.autoClosed) {
      await emitNotification({
        userId: req.user._id.toString(),
        type: 'ticket_auto_resolved',
        message: `Your ticket "${ticket.title}" has been automatically resolved. Please check the reply for details.`,
        ticketId: ticket._id.toString(),
        metadata: { 
          traceId, 
          autoResolved: true,
          confidence: triageResult.confidence,
          hasReply: true
        }
      });
    }

    const populated = await Ticket.findById(ticket._id).populate('agentSuggestionId').lean();
    
    // Transform agentSuggestionId data to match frontend expectations
    if (populated.agentSuggestionId) {
      populated.agentSuggestion = {
        predictedCategory: populated.agentSuggestionId.predictedCategory,
        confidence: populated.agentSuggestionId.confidence,
        draftReply: populated.agentSuggestionId.draftReply,
        kbCitations: populated.agentSuggestionId.articleIds || []
      };
      delete populated.agentSuggestionId;
    }
    
    res.status(201).json({ ticket: populated, traceId });
  } catch (e) { 
    next(e); 
  }
});

tickets.get('/', requireAuth, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.mine === 'true') filter.createdBy = req.user._id;
    
    const items = await Ticket.find(filter).sort({ updatedAt: -1 }).lean();
    res.json(items);
  } catch (e) { 
    next(e); 
  }
});

const idSchema = Joi.object({ 
  params: Joi.object({ 
    id: Joi.string().hex().length(24).required() 
  }) 
});

tickets.get('/:id', requireAuth, validate(idSchema), async (req, res, next) => {
  try {
    const doc = await Ticket.findById(req.params.id).populate('agentSuggestionId').lean();
    if (!doc) return res.status(404).json({ message: 'Not found' });
    
    // Transform agentSuggestionId data to match frontend expectations
    if (doc.agentSuggestionId) {
      doc.agentSuggestion = {
        predictedCategory: doc.agentSuggestionId.predictedCategory,
        confidence: doc.agentSuggestionId.confidence,
        draftReply: doc.agentSuggestionId.draftReply,
        kbCitations: doc.agentSuggestionId.articleIds || []
      };
      delete doc.agentSuggestionId;
    }
    
    res.json(doc);
  } catch (e) { 
    next(e); 
  }
});

tickets.get('/:id/audit', requireAuth, validate(idSchema), async (req, res, next) => {
  try {
    const auditEvents = await AuditLog.find({ ticketId: req.params.id })
      .sort({ timestamp: 1 }) // Ordered by timestamp ascending
      .lean();
      
    // Group events by traceId to show related operations
    const groupedEvents = auditEvents.reduce((acc, event) => {
      const traceId = event.traceId || 'unknown';
      if (!acc[traceId]) {
        acc[traceId] = [];
      }
      acc[traceId].push(event);
      return acc;
    }, {});
    
    // Create timeline with enhanced metadata
    const timeline = auditEvents.map(event => ({
      _id: event._id.toString(),
      traceId: event.traceId,
      actor: event.actor,
      action: event.action,
      meta: event.meta,
      timestamp: event.timestamp,
      relatedEvents: event.traceId ? groupedEvents[event.traceId].length : 1,
      description: generateEventDescription(event)
    }));
    
    res.json({
      ticketId: req.params.id,
      timeline,
      totalEvents: auditEvents.length,
      uniqueTraces: Object.keys(groupedEvents).length
    });
  } catch (e) { 
    next(e); 
  }
});

// Helper function to generate human-readable descriptions
function generateEventDescription(event) {
  const { action, actor, meta } = event;
  
  switch (action) {
    case 'TICKET_CREATED':
      return `Ticket created by ${actor} in ${meta.category} category`;
    case 'TRIAGE_ENQUEUED':
      return `Ticket queued for AI analysis (${meta.kbArticlesAvailable} KB articles available)`;
    case 'AGENT_RESPONSE_RECEIVED':
      return `AI analysis completed (confidence: ${meta.confidence}, ${meta.citationsCount} citations)`;
    case 'AUTO_RESOLVED_WITH_REPLY':
      return `Ticket auto-resolved (confidence ${meta.confidence} ≥ threshold ${meta.threshold})`;
    case 'REQUIRES_HUMAN_REVIEW':
      return `Requires human review (${meta.reason.toLowerCase().replace('_', ' ')})`;
    case 'AGENT_DRAFT_ACCEPTED':
      return `Agent ${meta.agentName} accepted AI draft reply`;
    case 'AGENT_DRAFT_EDITED':
      return `Agent ${meta.agentName} edited AI draft reply`;
    case 'AGENT_DRAFT_REJECTED':
      return `Agent ${meta.agentName} rejected AI draft reply`;
    case 'TICKET_RESOLVED_WITH_REPLY':
      return `Agent ${meta.agentName} resolved ticket with reply`;
    case 'AGENT_REPLY_SENT':
      return `Agent ${meta.agentName} sent reply`;
    case 'USER_REPLY_SENT':
      return `User ${meta.userName} replied to ticket`;
    case 'ASSIGNED':
      return `Ticket assigned to agent`;
    case 'TICKET_REOPENED':
      return `Ticket reopened by agent ${meta.agentName}`;
    case 'TRIAGE_COMPLETED':
      return `AI triage completed (${meta.totalProcessingTimeMs}ms processing time)`;
    default:
      return `${action.toLowerCase().replace('_', ' ')} by ${actor}`;
  }
}

tickets.get('/:id/replies', requireAuth, validate(idSchema), async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    
    // Check if user has access to this ticket
    const hasAccess = ticket.createdBy.equals(req.user._id) || 
                     (ticket.assignee && ticket.assignee.equals(req.user._id)) ||
                     req.user.role === 'agent' ||
                     req.user.role === 'admin';
                     
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const replies = await TicketReply.find({ ticketId: req.params.id })
      .populate('author', 'name email role')
      .populate('agentSuggestionId', 'confidence predictedCategory')
      .sort({ createdAt: 1 })
      .lean();
    
    // Filter internal replies for non-agent users (admin can see all replies)
    const filteredReplies = (req.user.role === 'agent' || req.user.role === 'admin') 
      ? replies 
      : replies.filter(reply => !reply.isInternal);
    
    res.json({
      ticketId: req.params.id,
      replies: filteredReplies.map(reply => ({
        id: reply._id,
        content: reply.content,
        author: reply.author,
        authorType: reply.authorType,
        isInternal: reply.isInternal,
        attachments: reply.attachments,
        citations: reply.citations,
        agentSuggestion: reply.agentSuggestionId,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt
      })),
      totalReplies: filteredReplies.length
    });
  } catch (e) { 
    next(e); 
  }
});

const replySchema = Joi.object({
  params: Joi.object({ 
    id: Joi.string().hex().length(24).required() 
  }),
  body: Joi.object({ 
    reply: Joi.string().min(1).required(), 
    close: Joi.boolean().default(false) 
  })
});

tickets.post('/:id/reply', requireAuth, requireRole('agent'), validate(replySchema), async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('createdBy');
    if (!ticket) return res.status(404).json({ message: 'Not found' });
    
    const traceId = newTraceId();
    
    // Create TicketReply instead of audit log for REPLY_SENT
    const reply = await TicketReply.create({
      ticketId: ticket._id,
      content: req.body.reply,
      author: req.user._id,
      authorType: 'agent',
      isInternal: false,
      citations: [],
      agentSuggestionId: null,
      traceId: traceId
    });
    
    const newStatus = req.body.close ? 'closed' : 'waiting_human';
    const oldStatus = ticket.status;
    ticket.status = newStatus;
    await ticket.save();

    // Send notification to ticket creator about the reply/status change
    const notificationType = req.body.close ? 'ticket_closed' : 'ticket_replied';
    const message = req.body.close 
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
        newStatus,
        hasReply: true
      }
    });

    res.json(ticket);
  } catch (e) { 
    next(e); 
  }
});

// User reply endpoint
const userReplySchema = Joi.object({
  params: Joi.object({ 
    id: Joi.string().hex().length(24).required() 
  }),
  body: Joi.object({ 
    reply: Joi.string().min(1).required(),
    attachments: Joi.array().items(Joi.string()).optional()
  })
});

tickets.post('/:id/user-reply', requireAuth, requireRole('user'), validate(userReplySchema), async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('createdBy');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    
    // Only ticket creator can reply
    if (ticket.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only reply to your own tickets' });
    }
    
    // Only allow replies if ticket is not closed
    if (ticket.status === 'closed') {
      return res.status(400).json({ message: 'Cannot reply to closed tickets' });
    }
    
    const traceId = newTraceId();
    
    // Create user reply
    const reply = await TicketReply.create({
      ticketId: ticket._id,
      content: req.body.reply,
      author: req.user._id,
      authorType: 'user',
      isInternal: false,
      attachments: req.body.attachments || [],
      traceId: traceId
    });
    
    // Update ticket status to indicate user response
    const oldStatus = ticket.status;
    if (ticket.status === 'resolved') {
      ticket.status = 'open'; // Reopen if was resolved
    } else if (ticket.status === 'waiting_human') {
      ticket.status = 'triaged'; // Move back to triaged for agent attention
    }
    await ticket.save();

    // Log the user reply action
    await AuditLog.create({ 
      ticketId: ticket._id, 
      traceId, 
      actor: 'user', 
      action: 'USER_REPLY_SENT', 
      meta: { 
        userId: req.user._id,
        userName: req.user.name,
        replyId: String(reply._id),
        hasAttachments: (req.body.attachments || []).length > 0,
        oldStatus,
        newStatus: ticket.status
      }, 
      timestamp: new Date() 
    });

    // Send notification to assigned agent or all agents if unassigned
    if (ticket.assignee) {
      await emitNotification({
        userId: ticket.assignee.toString(),
        type: 'user_replied',
        message: `User replied to ticket "${ticket.title}"`,
        ticketId: ticket._id.toString(),
        metadata: { 
          traceId, 
          userId: req.user._id.toString(),
          oldStatus,
          newStatus: ticket.status
        }
      });
    }

    res.json({ ticket, reply, traceId });
  } catch (e) { 
    next(e); 
  }
});

const assignSchema = Joi.object({
  params: Joi.object({ 
    id: Joi.string().hex().length(24).required() 
  }),
  body: Joi.object({ 
    assignee: Joi.string().hex().length(24).required() 
  })
});

tickets.post('/:id/assign', requireAuth, requireRole('agent', 'admin'), validate(assignSchema), async (req, res, next) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id, 
      { assignee: req.body.assignee, status: 'assigned' }, 
      { new: true }
    ).populate('createdBy');
    if (!ticket) return res.status(404).json({ message: 'Not found' });
    
    const traceId = newTraceId();
    await AuditLog.create({ 
      ticketId: ticket._id, 
      traceId, 
      actor: 'agent', 
      action: 'ASSIGNED', 
      meta: { assignee: req.body.assignee }, 
      timestamp: new Date() 
    });

    // Notify the assigned agent
    await emitNotification({
      userId: req.body.assignee,
      type: 'ticket_assigned',
      message: `You have been assigned to ticket "${ticket.title}".`,
      ticketId: ticket._id.toString(),
      metadata: { 
        traceId, 
        assignedBy: req.user._id.toString(),
        category: ticket.category
      }
    });

    // Notify ticket creator about assignment
    if (ticket.createdBy) {
      await emitNotification({
        userId: ticket.createdBy._id.toString(),
        type: 'ticket_assigned',
        message: `Your ticket "${ticket.title}" has been assigned to an agent.`,
        ticketId: ticket._id.toString(),
        metadata: { 
          traceId, 
          assigneeId: req.body.assignee,
          oldStatus: 'open',
          newStatus: 'assigned'
        }
      });
    }
    
    res.json(ticket);
  } catch (e) { 
    next(e); 
  }
});

// Agent review workflow endpoints
const reviewDraftSchema = Joi.object({
  params: Joi.object({ 
    id: Joi.string().hex().length(24).required() 
  }),
  body: Joi.object({ 
    action: Joi.string().valid('accept', 'edit', 'reject').required(),
    editedReply: Joi.when('action', { is: 'edit', then: Joi.string().min(1).required(), otherwise: Joi.optional() }),
    feedback: Joi.string().optional(),
    sendImmediately: Joi.boolean().default(false),
    closeTicket: Joi.boolean().default(false)
  })
});

tickets.post('/:id/review-draft', requireAuth, requireRole('agent'), validate(reviewDraftSchema), async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('agentSuggestionId createdBy');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (!ticket.agentSuggestionId) return res.status(400).json({ message: 'No agent suggestion found for this ticket' });
    if (ticket.status !== 'waiting_human') return res.status(400).json({ message: 'Ticket is not in waiting_human status' });

    const traceId = newTraceId();
    const { action, editedReply, feedback, sendImmediately, closeTicket } = req.body;
    
    let finalReply = ticket.agentSuggestionId.draftReply;
    let actionType = '';

    switch (action) {
      case 'accept':
        actionType = 'AGENT_DRAFT_ACCEPTED';
        break;
      case 'edit':
        actionType = 'AGENT_DRAFT_EDITED';
        finalReply = editedReply;
        break;
      case 'reject':
        actionType = 'AGENT_DRAFT_REJECTED';
        break;
    }

    // Log the review action
    await AuditLog.create({ 
      ticketId: ticket._id, 
      traceId, 
      actor: 'agent', 
      action: actionType, 
      meta: { 
        action,
        originalReply: ticket.agentSuggestionId.draftReply,
        editedReply: action === 'edit' ? editedReply : undefined,
        feedback,
        agentId: req.user._id,
        agentName: req.user.name,
        confidence: ticket.agentSuggestionId.confidence,
        willSendImmediately: sendImmediately,
        willCloseTicket: closeTicket
      }, 
      timestamp: new Date() 
    });

    // If sending immediately, create reply and update ticket status
    if (sendImmediately && (action === 'accept' || action === 'edit')) {
      // Create the reply
      const reply = await TicketReply.create({
        ticketId: ticket._id,
        content: finalReply,
        author: req.user._id,
        authorType: 'agent',
        isInternal: false,
        citations: ticket.agentSuggestionId.articleIds || [],
        agentSuggestionId: ticket.agentSuggestionId._id,
        traceId: traceId
      });

      const newStatus = closeTicket ? 'resolved' : 'open';
      const oldStatus = ticket.status;
      ticket.status = newStatus;
      await ticket.save();

      // Only create audit log for status change, not for reply sent
      if (closeTicket) {
        await AuditLog.create({ 
          ticketId: ticket._id, 
          traceId, 
          actor: 'agent', 
          action: 'TICKET_RESOLVED_WITH_REPLY', 
          meta: { 
            replyId: String(reply._id),
            reviewAction: action,
            closed: closeTicket,
            agentId: req.user._id,
            agentName: req.user.name,
            oldStatus,
            newStatus,
            citations: ticket.agentSuggestionId.articleIds?.length || 0
          }, 
          timestamp: new Date() 
        });
      }

      // Send notification to ticket creator
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
          newStatus,
          hasReply: true,
          reviewAction: action
        }
      });
    }

    const updatedTicket = await Ticket.findById(ticket._id).populate('agentSuggestionId').lean();
    
    // Transform agentSuggestionId data to match frontend expectations
    if (updatedTicket.agentSuggestionId) {
      updatedTicket.agentSuggestion = {
        predictedCategory: updatedTicket.agentSuggestionId.predictedCategory,
        confidence: updatedTicket.agentSuggestionId.confidence,
        draftReply: updatedTicket.agentSuggestionId.draftReply,
        kbCitations: updatedTicket.agentSuggestionId.articleIds || []
      };
      delete updatedTicket.agentSuggestionId;
    }
    
    res.json({ 
      ticket: updatedTicket, 
      traceId,
      reviewResult: {
        action,
        finalReply,
        sent: sendImmediately,
        status: updatedTicket.status
      }
    });
  } catch (e) { 
    next(e); 
  }
});

const reopenSchema = Joi.object({
  params: Joi.object({ 
    id: Joi.string().hex().length(24).required() 
  }),
  body: Joi.object({ 
    reason: Joi.string().optional()
  })
});

tickets.post('/:id/reopen', requireAuth, requireRole('agent'), validate(reopenSchema), async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate('createdBy');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (ticket.status !== 'closed') return res.status(400).json({ message: 'Only closed tickets can be reopened' });

    const traceId = newTraceId();
    const oldStatus = ticket.status;
    ticket.status = 'waiting_human';
    await ticket.save();

    await AuditLog.create({ 
      ticketId: ticket._id, 
      traceId, 
      actor: 'agent', 
      action: 'TICKET_REOPENED', 
      meta: { 
        reason: req.body.reason,
        oldStatus,
        newStatus: 'waiting_human',
        agentId: req.user._id,
        agentName: req.user.name
      }, 
      timestamp: new Date() 
    });

    // Notify ticket creator about reopening
    await emitNotification({
      userId: ticket.createdBy._id.toString(),
      type: 'ticket_reopened',
      message: `Your ticket "${ticket.title}" has been reopened for further review.`,
      ticketId: ticket._id.toString(),
      metadata: { 
        traceId, 
        agentId: req.user._id.toString(),
        reason: req.body.reason,
        oldStatus,
        newStatus: 'waiting_human'
      }
    });

    res.json({ ticket, traceId });
  } catch (e) { 
    next(e); 
  }
});
