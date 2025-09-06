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
import { PendingTicket } from '../models/PendingTicket.js';
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

// Get agent dashboard with metrics and pending tickets
agent.get('/dashboard', requireAuth, requireRole('agent'), async (req, res, next) => {
  try {
    const agentId = req.query.agentId; // Agent ID from query parameters
    const showAll = req.query.showAll === 'true'; // Optional parameter to show all tickets
    
    console.log('Dashboard request params:', { agentId, showAll });
    
    if (!agentId) {
      return res.status(400).json({ message: 'Agent ID is required' });
    }

    // Get tickets that need agent attention
    const pendingTickets = await Ticket.find({
      status: { $in: ['waiting_human', 'open'] }
    })
    .populate('agentSuggestionId')
    .populate('createdBy', 'name email')
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

    // Get agent-specific metrics
    const [
      acceptedTicketsCount,
      rejectedTicketsCount,
      closedTicketsCount,
      pendingTicketsForAgent,
      agentPendingTickets,
      allPendingTickets
    ] = await Promise.all([
      // Count accepted tickets by this agent
      PendingTicket.countDocuments({ 
        agentId: agentId, 
        status: 'accepted'
      }),
      
      // Count rejected tickets by this agent
      PendingTicket.countDocuments({ 
        agentId: agentId, 
        status: 'rejected'
      }),
      
      // Count closed tickets by this agent (from audit logs)
      PendingTicket.countDocuments({
        agentId: agentId,
        status: { $all: ['accepted', 'closed'] }
      }),
      
      // Count pending tickets assigned to this agent
      PendingTicket.countDocuments({
        agentId: agentId,
        status: 'pending'
      }),
      
      // Get detailed pending tickets for this agent (all statuses)
      PendingTicket.find({
        agentId: agentId
      })
      .populate({
        path: 'ticketId',
        populate: [
          {
            path: 'createdBy',
            select: 'name email'
          },
          {
            path: 'agentSuggestionId'
          }
        ]
      })
      .sort({ assignedAt: -1 })
      .limit(20)
      .lean(),
      
      // Get all pending tickets (regardless of agent) if showAll is true
      showAll ? PendingTicket.find({})
        .populate({
          path: 'ticketId',
          populate: [
            {
              path: 'createdBy',
              select: 'name email'
            },
            {
              path: 'agentSuggestionId'
            }
          ]
        })
        .sort({ assignedAt: -1 })
        .limit(100)
        .lean() : []
    ]);

    // Transform general pending tickets for frontend
    const ticketsWithSuggestions = pendingTickets.map(ticket => {
      if (ticket.agentSuggestionId) {
        ticket.agentSuggestion = {
          predictedCategory: ticket.agentSuggestionId.predictedCategory,
          confidence: ticket.agentSuggestionId.confidence,
          draftReply: ticket.agentSuggestionId.draftReply,
          kbCitations: ticket.agentSuggestionId.articleIds || [],
          autoClosed: ticket.agentSuggestionId.autoClosed || false,
          reviewed: ticket.agentSuggestionId.reviewed || false,
          reviewResult: ticket.agentSuggestionId.reviewResult || null,
          reviewedBy: ticket.agentSuggestionId.reviewedBy || null,
          reviewedAt: ticket.agentSuggestionId.reviewedAt || null
        };
        delete ticket.agentSuggestionId;
      }
      return ticket;
    });

    // Transform agent pending tickets for frontend
    const transformedAgentPendingTickets = agentPendingTickets.map(pendingTicket => {
      if (pendingTicket.ticketId && pendingTicket.ticketId.agentSuggestionId) {
        pendingTicket.ticketId.agentSuggestion = {
          predictedCategory: pendingTicket.ticketId.agentSuggestionId.predictedCategory,
          confidence: pendingTicket.ticketId.agentSuggestionId.confidence,
          draftReply: pendingTicket.ticketId.agentSuggestionId.draftReply,
          kbCitations: pendingTicket.ticketId.agentSuggestionId.articleIds || [],
          autoClosed: pendingTicket.ticketId.agentSuggestionId.autoClosed || false,
          reviewed: pendingTicket.ticketId.agentSuggestionId.reviewed || false,
          reviewResult: pendingTicket.ticketId.agentSuggestionId.reviewResult || null,
          reviewedBy: pendingTicket.ticketId.agentSuggestionId.reviewedBy || null,
          reviewedAt: pendingTicket.ticketId.agentSuggestionId.reviewedAt || null
        };
        delete pendingTicket.ticketId.agentSuggestionId;
      }
      return pendingTicket;
    });
    
    // Transform all pending tickets (if showAll is true)
    const transformedAllPendingTickets = allPendingTickets.map(pendingTicket => {
      if (pendingTicket.ticketId && pendingTicket.ticketId.agentSuggestionId) {
        pendingTicket.ticketId.agentSuggestion = {
          predictedCategory: pendingTicket.ticketId.agentSuggestionId.predictedCategory,
          confidence: pendingTicket.ticketId.agentSuggestionId.confidence,
          draftReply: pendingTicket.ticketId.agentSuggestionId.draftReply,
          kbCitations: pendingTicket.ticketId.agentSuggestionId.articleIds || [],
          autoClosed: pendingTicket.ticketId.agentSuggestionId.autoClosed || false,
          reviewed: pendingTicket.ticketId.agentSuggestionId.reviewed || false,
          reviewResult: pendingTicket.ticketId.agentSuggestionId.reviewResult || null,
          reviewedBy: pendingTicket.ticketId.agentSuggestionId.reviewedBy || null,
          reviewedAt: pendingTicket.ticketId.agentSuggestionId.reviewedAt || null
        };
        delete pendingTicket.ticketId.agentSuggestionId;
      }
      return pendingTicket;
    });

    console.log('Agent dashboard - returning data:', {
      agentId,
      totalPendingTickets: ticketsWithSuggestions.length,
      agentAcceptedCount: acceptedTicketsCount,
      agentRejectedCount: rejectedTicketsCount,
      agentPendingTicketsCount: transformedAgentPendingTickets.length,
      acceptedTickets: transformedAgentPendingTickets.filter(t => t.status === 'accepted').length,
      rejectedTickets: transformedAgentPendingTickets.filter(t => t.status === 'rejected').length,
      pendingTickets: transformedAgentPendingTickets.filter(t => t.status === 'pending').length,
      showAll,
      allPendingTicketsCount: transformedAllPendingTickets.length
    });

    res.json({
      // General dashboard data
      pendingTickets: ticketsWithSuggestions,
      totalPending: ticketsWithSuggestions.length,
      
      // Agent-specific metrics
      agentMetrics: {
        agentId: agentId,
        acceptedTickets: acceptedTicketsCount,
        rejectedTickets: rejectedTicketsCount,
        closedTickets: closedTicketsCount,
        pendingTickets: pendingTicketsForAgent,
        agentPendingTickets: transformedAgentPendingTickets
      },
      
      // All pending tickets (if showAll is true)
      allPendingTickets: showAll ? transformedAllPendingTickets : undefined
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
        qualityMetrics: ticket.agentSuggestionId.qualityMetrics || {},
        reviewed: ticket.agentSuggestionId.reviewed || false,
        reviewResult: ticket.agentSuggestionId.reviewResult || null,
        reviewedBy: ticket.agentSuggestionId.reviewedBy || null,
        reviewedAt: ticket.agentSuggestionId.reviewedAt || null
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

// Handle agent draft acceptance/rejection
const agentResponseSchema = Joi.object({
  body: Joi.object({
    ticketId: Joi.string().hex().length(24).required(),
    action: Joi.string().valid('accept', 'reject').required(),
    agentId: Joi.string().required(),
    agentName: Joi.string().required(),
    originalReply: Joi.string().required(),
    confidence: Joi.number().min(0).max(1).required(),
    willSendImmediately: Joi.boolean().default(false),
    willCloseTicket: Joi.boolean().default(false),
    traceId: Joi.string().required()
  })
});

agent.post('/respond-to-draft', requireAuth, requireRole('agent'), validate(agentResponseSchema), async (req, res, next) => {
  try {

    const { 
      ticketId, 
      action, 
      agentId, 
      agentName, 
      originalReply, 
      confidence, 
      willSendImmediately, 
      willCloseTicket, 
      traceId 
    } = req.body;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Prevent multiple agents from accepting the same ticket
    if (action === 'accept') {
      const alreadyAccepted = await PendingTicket.findOne({ ticketId, status: 'accepted' });
      if (alreadyAccepted) {
        return res.status(409).json({ message: 'This ticket has already been accepted by another agent.' });
      }
    }

    // Create audit log entry
    const auditLog = await AuditLog.create({
      ticketId,
      traceId,
      actor: 'agent',
      action: `AGENT_DRAFT_${action.toUpperCase()}`,
      meta: {
        action,
        originalReply,
        agentId,
        agentName,
        confidence,
        willSendImmediately,
        willCloseTicket
      },
      timestamp: new Date()
    });

    // Create or update pending ticket record
    let pendingTicket = await PendingTicket.findOne({ ticketId, agentId });
    if (!pendingTicket) {
      pendingTicket = await PendingTicket.create({
        ticketId,
        agentId,
        agentName,
        action,
        originalReply,
        confidence,
        willSendImmediately,
        willCloseTicket,
        status: action === 'accept' ? 'pending' : 'rejected',
        traceId,
        auditLogId: auditLog._id,
        respondedAt: new Date()
      });
    } else {
      pendingTicket.action = action;
      // If accepted, set to 'pending' (awaiting closure); else 'rejected'
      if (action === 'accept') {
        pendingTicket.status = 'pending';
      } else if (action === 'reject') {
        pendingTicket.status = 'rejected';
      }
      pendingTicket.respondedAt = new Date();
      pendingTicket.auditLogId = auditLog._id;
      await pendingTicket.save();
    }

    // Accept/reject logic
    if (action === 'accept') {
      ticket.assignee = req.user._id; // Assign to the current user (agent)
      ticket.status = 'triaged';
      await ticket.save();

      // Always update PendingTicket status to 'pending' after accept
      const updateResult = await PendingTicket.updateMany(
        { ticketId: ticket._id, agentId: req.user._id },
        { $set: { status: 'pending' } }
      );
      console.log('[PendingTicket] Set to pending:', updateResult);

      // Send notification
      await emitNotification({
        userId: ticket.createdBy.toString(),
        type: 'ticket_assigned',
        message: `Your ticket "${ticket.title}" has been assigned to an agent.`,
        ticketId: ticket._id.toString(),
        metadata: {
          traceId,
          agentId,
          agentName,
          action: 'accepted'
        }
      });
    } else if (action === 'reject') {
      // If rejected, keep ticket open for reassignment
      ticket.status = 'open';
      await ticket.save();
    }

    // If the ticket is now closed or resolved, update all related PendingTickets to 'closed'
    if (['closed', 'resolved'].includes(ticket.status)) {
      const closeResult = await PendingTicket.updateMany(
        { ticketId: ticket._id },
        { $set: { status: 'closed' } }
      );
      console.log('[PendingTicket] Set to closed:', closeResult);
    }

    res.json({
      success: true,
      action,
      pendingTicket,
      ticketStatus: ticket.status,
      message: `Draft ${action}ed successfully`
    });
  } catch (e) {
    next(e);
  }
});

// Get agent metrics
const agentMetricsSchema = Joi.object({
  params: Joi.object({
    agentId: Joi.string().required()
  })
});

agent.get('/metrics/:agentId', requireAuth, requireRole('agent', 'admin'), validate(agentMetricsSchema), async (req, res, next) => {
  try {
    const { agentId } = req.params;

    const [
      acceptedTickets,
      rejectedTickets,
      closedTickets,
      pendingTickets,
      recentActivity
    ] = await Promise.all([
      // Accepted tickets
      PendingTicket.find({ 
        agentId, 
        action: 'accept',
        status: 'accepted'
      })
      .populate('ticketId', 'title status createdAt')
      .sort({ respondedAt: -1 })
      .limit(10)
      .lean(),

      // Rejected tickets
      PendingTicket.find({ 
        agentId, 
        action: 'reject',
        status: 'rejected'
      })
      .populate('ticketId', 'title status createdAt')
      .sort({ respondedAt: -1 })
      .limit(10)
      .lean(),

      // Closed tickets count
      AuditLog.countDocuments({
        'meta.agentId': agentId,
        action: { $in: ['TICKET_RESOLVED_WITH_REPLY', 'TICKET_CLOSED'] }
      }),

      // Pending tickets count
      PendingTicket.countDocuments({
        agentId,
        status: 'pending'
      }),

      // Recent activity
      AuditLog.find({
        'meta.agentId': agentId
      })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean()
    ]);

    res.json({
      agentId,
      metrics: {
        acceptedTicketsCount: acceptedTickets.length,
        rejectedTicketsCount: rejectedTickets.length,
        closedTicketsCount: closedTickets,
        pendingTicketsCount: pendingTickets,
        totalProcessed: acceptedTickets.length + rejectedTickets.length
      },
      acceptedTickets,
      rejectedTickets,
      recentActivity
    });
  } catch (e) {
    next(e);
  }
});

// Get all agents summary (for admin dashboard)
agent.get('/agents-summary', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    // Get all unique agent IDs from pending tickets
    const agentIds = await PendingTicket.distinct('agentId');
    
    const agentsSummary = await Promise.all(
      agentIds.map(async (agentId) => {
        const [accepted, rejected, closed, pending] = await Promise.all([
          PendingTicket.countDocuments({ agentId, action: 'accept', status: 'accepted' }),
          PendingTicket.countDocuments({ agentId, action: 'reject', status: 'rejected' }),
          AuditLog.countDocuments({
            'meta.agentId': agentId,
            action: { $in: ['TICKET_RESOLVED_WITH_REPLY', 'TICKET_CLOSED'] }
          }),
          PendingTicket.countDocuments({ agentId, status: 'pending' })
        ]);

        // Get agent name from the most recent record
        const recentRecord = await PendingTicket.findOne({ agentId }).sort({ createdAt: -1 });
        
        return {
          agentId,
          agentName: recentRecord?.agentName || 'Unknown',
          accepted,
          rejected,
          closed,
          pending,
          totalProcessed: accepted + rejected
        };
      })
    );

    res.json({
      agents: agentsSummary,
      totalAgents: agentsSummary.length
    });
  } catch (e) {
    next(e);
  }
});
