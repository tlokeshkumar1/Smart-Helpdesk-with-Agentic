import { PendingTicket } from '../models/PendingTicket.js';
import { AuditLog } from '../models/AuditLog.js';
import { Ticket } from '../models/Ticket.js';

/**
 * Process agent draft acceptance from audit logs and create pending tickets
 * This function should be called when an AGENT_DRAFT_ACCEPTED audit log is created
 */
export async function processAgentDraftAcceptance(auditLogData) {
  try {
    const { ticketId, traceId, meta } = auditLogData;
    
    if (!meta || meta.action !== 'accept') {
      console.log('Skipping non-acceptance audit log');
      return;
    }

    // Check if pending ticket already exists
    const existingPendingTicket = await PendingTicket.findOne({
      ticketId,
      agentId: meta.agentId,
      traceId
    });

    if (existingPendingTicket) {
      console.log('Pending ticket already exists, updating status');
      existingPendingTicket.status = 'accepted';
      existingPendingTicket.respondedAt = new Date();
      await existingPendingTicket.save();
      return existingPendingTicket;
    }

    // Create new pending ticket
    const pendingTicket = await PendingTicket.create({
      ticketId,
      agentId: meta.agentId,
      agentName: meta.agentName,
      action: meta.action,
      originalReply: meta.originalReply,
      confidence: meta.confidence,
      willSendImmediately: meta.willSendImmediately || false,
      willCloseTicket: meta.willCloseTicket || false,
      status: 'accepted',
      traceId,
      respondedAt: new Date()
    });

    console.log('Created pending ticket for agent acceptance:', {
      ticketId,
      agentId: meta.agentId,
      pendingTicketId: pendingTicket._id
    });

    return pendingTicket;
  } catch (error) {
    console.error('Error processing agent draft acceptance:', error);
    throw error;
  }
}

/**
 * Get agent statistics
 */
export async function getAgentStatistics(agentId) {
  try {
    const [
      acceptedCount,
      rejectedCount,
      closedCount,
      pendingCount,
      recentActivity
    ] = await Promise.all([
      PendingTicket.countDocuments({ agentId, action: 'accept', status: 'accepted' }),
      PendingTicket.countDocuments({ agentId, action: 'reject', status: 'rejected' }),
      AuditLog.countDocuments({
        'meta.agentId': agentId,
        action: { $in: ['TICKET_RESOLVED_WITH_REPLY', 'TICKET_CLOSED'] }
      }),
      PendingTicket.countDocuments({ agentId, status: 'pending' }),
      AuditLog.find({ 'meta.agentId': agentId })
        .sort({ timestamp: -1 })
        .limit(10)
        .lean()
    ]);

    return {
      agentId,
      accepted: acceptedCount,
      rejected: rejectedCount,
      closed: closedCount,
      pending: pendingCount,
      totalProcessed: acceptedCount + rejectedCount,
      recentActivity
    };
  } catch (error) {
    console.error('Error getting agent statistics:', error);
    throw error;
  }
}

/**
 * Create pending ticket from agent suggestion
 * This is used when AI suggests a response and we want to track it for agent review
 */
export async function createPendingTicketFromSuggestion({
  ticketId,
  agentId,
  agentName,
  originalReply,
  confidence,
  traceId
}) {
  try {
    const pendingTicket = await PendingTicket.create({
      ticketId,
      agentId,
      agentName,
      action: 'accept', // Default to accept for AI suggestions
      originalReply,
      confidence,
      willSendImmediately: false,
      willCloseTicket: false,
      status: 'pending',
      traceId,
      assignedAt: new Date()
    });

    console.log('Created pending ticket from AI suggestion:', {
      ticketId,
      agentId,
      pendingTicketId: pendingTicket._id
    });

    return pendingTicket;
  } catch (error) {
    console.error('Error creating pending ticket from suggestion:', error);
    throw error;
  }
}
