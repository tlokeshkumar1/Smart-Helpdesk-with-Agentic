import { config } from '../config.js';
import { httpPostJson } from '../utils/httpClient.js';
import { AuditLog } from '../models/AuditLog.js';
import { AgentSuggestion } from '../models/AgentSuggestion.js';
import { Ticket } from '../models/Ticket.js';
import { Config } from '../models/Config.js';
import { Article } from '../models/Article.js';
import { TicketReply } from '../models/TicketReply.js';

async function persistStepLogs(ticketId, traceId, stepLogs = []) {
  if (!Array.isArray(stepLogs)) return;
  
  const docs = stepLogs.map(s => ({
    ticketId, 
    traceId, 
    actor: 'system', 
    action: s.action, 
    meta: s.meta || {}, 
    timestamp: new Date()
  }));
  
  if (docs.length) await AuditLog.insertMany(docs);
}

export async function triageTicket({ ticketId, traceId }) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw Object.assign(new Error('Ticket not found'), { status: 404 });

  const kbArticles = await Article.find({ 
    status: { $in: ['publish', 'published'] } 
  }).lean();

  // Enhanced logging - ticket enqueued
  await AuditLog.create({ 
    ticketId, 
    traceId, 
    actor: 'system', 
    action: 'TRIAGE_ENQUEUED', 
    meta: {
      category: ticket.category,
      title: ticket.title.substring(0, 100),
      kbArticlesAvailable: kbArticles.length
    }, 
    timestamp: new Date() 
  });

  const payload = {
    traceId,
    ticket: {
      id: String(ticket._id),
      title: ticket.title,
      description: ticket.description
    },
    kb: kbArticles.map(a => ({ 
      id: String(a._id), 
      title: a.title, 
      body: a.body, 
      tags: a.tags 
    }))
  };

  let resp = null;
  let attempt = 0;
  const maxRetry = config.agent.retry;
  const startTime = Date.now();
  
  while (attempt <= maxRetry) {
    try {
      const attemptStart = Date.now();
      resp = await httpPostJson(`${config.agent.baseUrl}/triage`, payload, { 
        timeoutMs: config.agent.timeoutMs 
      });
      
      // Enhanced timing and quality metrics
      const attemptDuration = Date.now() - attemptStart;
      resp.modelInfo = { 
        ...resp.modelInfo, 
        latencyMs: attemptDuration,
        attempt: attempt + 1,
        totalAttempts: attempt + 1
      };
      
      // Log successful agent response
      await AuditLog.create({
        ticketId,
        traceId,
        actor: 'system',
        action: 'AGENT_RESPONSE_RECEIVED',
        meta: {
          latencyMs: attemptDuration,
          confidence: resp.confidence,
          category: resp.predictedCategory,
          citationsCount: resp.citations?.length || 0,
          responseLength: resp.draftReply?.length || 0
        },
        timestamp: new Date()
      });
      
      break;
    } catch (err) {
      attempt++;
      const retryMeta = { 
        attempt, 
        error: err.message,
        latencyMs: Date.now() - startTime,
        willRetry: attempt <= maxRetry
      };
      
      await AuditLog.create({ 
        ticketId, 
        traceId, 
        actor: 'system', 
        action: 'TRIAGE_RETRY', 
        meta: retryMeta, 
        timestamp: new Date() 
      });
      
      if (attempt > maxRetry) {
        // Log final failure
        await AuditLog.create({
          ticketId,
          traceId,
          actor: 'system',
          action: 'TRIAGE_FAILED',
          meta: {
            totalAttempts: attempt,
            finalError: err.message,
            totalLatencyMs: Date.now() - startTime
          },
          timestamp: new Date()
        });
        throw err;
      }
    }
  }

  // Persist enhanced logs from worker
  await persistStepLogs(ticketId, traceId, resp.stepLogs);

  const cfg = await Config.findOne() || await new Config({}).save();
  const shouldAutoClose = cfg.autoCloseEnabled && resp.confidence >= cfg.confidenceThreshold;

  // Enhanced agent suggestion with quality metrics
  const suggestion = await AgentSuggestion.create({
    ticketId,
    predictedCategory: resp.predictedCategory,
    articleIds: resp.citations || [],
    draftReply: resp.draftReply,
    confidence: resp.confidence,
    originalConfidence: resp.originalConfidence || resp.confidence,
    autoClosed: shouldAutoClose,
    modelInfo: resp.modelInfo,
    qualityMetrics: resp.quality || {}
  });

  // Update ticket with enhanced information
  ticket.category = resp.predictedCategory;
  ticket.agentSuggestionId = suggestion._id;
  ticket.status = shouldAutoClose ? 'resolved' : 'waiting_human';
  
  if (shouldAutoClose) {
    // Create automated reply when auto-closing - user sees this reply
    const autoReply = await TicketReply.create({
      ticketId: ticket._id,
      content: resp.draftReply,
      authorType: 'system',
      isInternal: false,
      citations: resp.citations || [],
      agentSuggestionId: suggestion._id
    });
    
    await AuditLog.create({ 
      ticketId, 
      traceId, 
      actor: 'system', 
      action: 'AUTO_RESOLVED_WITH_REPLY', 
      meta: { 
        suggestionId: String(suggestion._id),
        replyId: String(autoReply._id),
        confidence: resp.confidence,
        threshold: cfg.confidenceThreshold,
        category: resp.predictedCategory,
        citationsUsed: resp.citations?.length || 0,
        processingTimeMs: resp.modelInfo?.totalProcessingTimeMs || 0,
        autoReplyCreated: true,
        replyLength: resp.draftReply?.length || 0,
        reason: 'CONFIDENCE_ABOVE_THRESHOLD'
      }, 
      timestamp: new Date() 
    });
  } else {
    const assignmentReason = resp.confidence < cfg.confidenceThreshold 
      ? 'CONFIDENCE_BELOW_THRESHOLD' 
      : 'AUTO_CLOSE_DISABLED';
      
    await AuditLog.create({ 
      ticketId, 
      traceId, 
      actor: 'system', 
      action: 'REQUIRES_HUMAN_REVIEW', 
      meta: {
        reason: assignmentReason,
        confidence: resp.confidence,
        threshold: cfg.confidenceThreshold,
        autoCloseEnabled: cfg.autoCloseEnabled,
        suggestionId: String(suggestion._id),
        draftAvailable: !!resp.draftReply,
        draftLength: resp.draftReply?.length || 0,
        status: 'waiting_human'
      }, 
      timestamp: new Date() 
    });
  }
  
  await ticket.save();

  // Final completion log
  await AuditLog.create({
    ticketId,
    traceId,
    actor: 'system',
    action: 'TRIAGE_COMPLETED',
    meta: {
      finalStatus: ticket.status,
      finalCategory: ticket.category,
      confidence: resp.confidence,
      autoClosed: shouldAutoClose,
      totalProcessingTimeMs: Date.now() - startTime,
      suggestionId: String(suggestion._id)
    },
    timestamp: new Date()
  });

  return { 
    suggestionId: String(suggestion._id), 
    autoClosed: shouldAutoClose,
    confidence: resp.confidence,
    threshold: cfg.confidenceThreshold
  };
}
