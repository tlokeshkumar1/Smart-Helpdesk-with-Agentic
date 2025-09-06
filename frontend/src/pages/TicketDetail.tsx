import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTicketsStore } from '../stores/tickets';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { AgentReview } from '../components/AgentReview';
import { ArrowLeft, Clock, User, Tag, RotateCcw, Check, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors = {
  open: 'secondary',
  triaged: 'default',
  assigned: 'warning',
  waiting_human: 'danger',
  resolved: 'success',
  closed: 'success',
} as const;

export const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    currentTicket, 
    agentSuggestion, 
    auditEvents,
    replies,
    isLoading, 
    fetchTicket, 
    fetchAuditEvents,
    fetchReplies,
    replyToTicket,
    userReplyToTicket,
    reviewDraft,
    reopenTicket,
    closeTicket
  } = useTicketsStore();

  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  useEffect(() => {
    if (id) {
      const loadTicket = async () => {
        try {
          await fetchTicket(id);
          await fetchAuditEvents(id);
          await fetchReplies(id);
        } catch {
          toast.error('Failed to load ticket');
          navigate('/tickets');
        }
      };
      loadTicket();
    }
  }, [id, fetchTicket, fetchAuditEvents, fetchReplies, navigate]);

  const handleReply = async (closeAfter = false) => {
    if (!id || !replyText.trim()) return;

    setIsReplying(true);
    try {
      await replyToTicket(id, replyText, closeAfter);
      setReplyText('');
      toast.success(closeAfter ? 'Reply sent and ticket closed' : 'Reply sent');
      await fetchAuditEvents(id);
      await fetchReplies(id);
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setIsReplying(false);
    }
  };

  const handleReviewDraft = async (action: 'accept' | 'edit' | 'reject', options?: {
    editedReply?: string;
    feedback?: string;
    sendImmediately?: boolean;
    closeTicket?: boolean;
  }) => {
    if (!id) return;

    setIsReviewing(true);
    try {
      await reviewDraft(id, action, options);
      console.log(`Successfully ${action}ed draft for ticket ${id}`);
      // No page refresh needed - the store updates will trigger React re-render
    } catch (error) {
      console.error(`Error ${action}ing draft:`, error);
      throw error;
    } finally {
      setIsReviewing(false);
    }
  };

  const handleUserReply = async () => {
    if (!id || !replyText.trim()) return;

    setIsReplying(true);
    try {
      await userReplyToTicket(id, replyText);
      setReplyText('');
      toast.success('Reply sent successfully');
      await fetchAuditEvents(id);
    } catch {
      toast.error('Failed to send reply');
    } finally {
      setIsReplying(false);
    }
  };

  const handleReopenTicket = async () => {
    if (!id) return;

    const reason = prompt('Please provide a reason for reopening this ticket (optional):');
    
    try {
      await reopenTicket(id, reason || undefined);
      toast.success('Ticket reopened successfully');
    } catch {
      toast.error('Failed to reopen ticket');
    }
  };

  const handleCloseTicket = async () => {
    if (!id) return;
    
    const confirmClose = window.confirm('Are you sure you want to close this ticket? This action cannot be undone.');
    if (!confirmClose) return;

    try {
      await closeTicket(id);
      toast.success('Ticket closed successfully');
    } catch {
      toast.error('Failed to close ticket');
    }
  };

  if (isLoading || !currentTicket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <LoadingSkeleton className="h-8 w-8" />
          <LoadingSkeleton className="h-8 w-64" />
        </div>
        <LoadingSkeleton lines={10} />
      </div>
    );
  }

  const canReply = user?.role === 'agent' && 
    ['triaged', 'assigned', 'waiting_human', 'resolved'].includes(currentTicket.status);

  const canUserReply = user?.role === 'user' && 
    currentTicket.userId === user._id &&
    !['closed'].includes(currentTicket.status);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tickets')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">{currentTicket.title}</h1>
        </div>
        {isAdmin && (
          <div className="bg-blue-50 text-blue-800 px-3 py-1 rounded-lg text-sm font-medium">
            Read-only view
          </div>
        )}
      </div>

      {/* Ticket Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ticket Details</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={statusColors[currentTicket.status]}>
                {currentTicket.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Ticket ID - only visible to admin users */}
          {isAdmin && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Ticket ID:</span>
                <span className="text-sm font-mono font-medium text-gray-900">
                  {currentTicket._id}
                </span>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Category:</span>
              <span className="text-sm font-medium">
                {currentTicket.category || 'Uncategorized'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Assignee:</span>
              <span className="text-sm font-medium">
                {currentTicket.assignee || 'Unassigned'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">Updated:</span>
              <span className="text-sm font-medium">
                {new Date(currentTicket.updatedAt).toLocaleString()}
              </span>
            </div>
            {/* Additional admin info */}
            {isAdmin && (
              <>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Created:</span>
                  <span className="text-sm font-medium">
                    {new Date(currentTicket.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Created By:</span>
                  <span className="text-sm font-medium">
                    {typeof currentTicket.createdBy === 'object' && currentTicket.createdBy?.email 
                      ? currentTicket.createdBy.email 
                      : (typeof currentTicket.createdBy === 'string' ? currentTicket.createdBy : currentTicket.userId || 'Unknown')}
                  </span>
                </div>
              </>
            )}
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Description</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{currentTicket.description}</p>
          </div>

          {currentTicket.attachments && currentTicket.attachments.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Attachments</h4>
              <div className="space-y-2">
                {currentTicket.attachments.map((url, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
                    >
                      {url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Suggestion - For agents (with actions) and admins (read-only) */}
      {agentSuggestion && !agentSuggestion.reviewed && user?.role === 'agent' && ['waiting_human', 'resolved'].includes(currentTicket.status) && (
        <AgentReview
          agentSuggestion={agentSuggestion}
          onReview={handleReviewDraft}
          isLoading={isReviewing}
        />
      )}

      {/* Show review result only if reviewed AND rejected - Only for agents and admins */}
      {agentSuggestion && agentSuggestion.reviewed && agentSuggestion.reviewResult === 'rejected' && (user?.role === 'agent' || isAdmin) && (
        <Card>
          <CardHeader>
            <CardTitle>AI Suggestion Review Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant="danger">
                  Rejected
                </Badge>
              </div>
              {agentSuggestion.reviewedAt && (
                <div className="text-sm text-gray-600">
                  Reviewed on {new Date(agentSuggestion.reviewedAt).toLocaleString()}
                </div>
              )}
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="text-sm font-medium text-gray-700 mb-2">AI Suggested Reply:</h5>
                <p className="text-gray-800 whitespace-pre-wrap">{agentSuggestion.draftReply}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Suggestion - Read-only for admins */}
      {agentSuggestion && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>AI Agent Suggestion (Read-only)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Predicted Category</h4>
                <Badge variant="default">{agentSuggestion.predictedCategory}</Badge>
                <span className="ml-2 text-sm text-gray-600">
                  Confidence: {Math.round(agentSuggestion.confidence * 100)}%
                </span>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Draft Reply</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{agentSuggestion.draftReply}</p>
                </div>
              </div>

              {agentSuggestion.kbCitations && agentSuggestion.kbCitations.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Knowledge Base Citations</h4>
                  <div className="space-y-2">
                    {agentSuggestion.kbCitations.map((citation, index) => (
                      <div key={index} className="text-sm text-blue-600">
                        Article: {citation}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}



      {/* Conversation Section */}
      {replies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {replies.map((reply, replyIndex) => {
                const isCurrentUser = reply.author?._id === user?._id;
                return (
                  <div 
                    key={reply._id || `reply-${replyIndex}`} 
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[70%] p-4 rounded-lg ${
                        isCurrentUser
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {reply.author?._id === user?._id 
                          ? 'You' 
                          : reply.authorType === 'agent' 
                            ? `Agent${reply.author?.name ? ` (${reply.author.name})` : ''}` 
                            : reply.authorType === 'user' 
                              ? `User${reply.author?.name ? ` (${reply.author.name})` : ''}` 
                              : 'System'
                        }
                      </span>
                      <span className={`text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                        {new Date(reply.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{reply.content}</p>
                    {reply.attachments && reply.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {reply.attachments.map((url, index) => (
                          <a 
                            key={`${reply._id || `reply-${replyIndex}`}-attachment-${index}`}
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`block text-sm underline ${
                              isCurrentUser ? 'text-blue-100' : 'text-blue-600'
                            }`}
                          >
                            Attachment {index + 1}
                          </a>
                        ))}
                      </div>
                    )}
                    {reply.citations && reply.citations.length > 0 && (
                      <div className="mt-2">
                        <span className={`text-xs ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'}`}>
                          Referenced: {reply.citations.map((citation, citationIndex) => (
                            <span key={`${reply._id || `reply-${replyIndex}`}-citation-${citationIndex}`}>
                              {citationIndex > 0 && ', '}{citation}
                            </span>
                          ))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Reply Form */}
      {canUserReply && (
        <Card>
          <CardHeader>
            <CardTitle>Reply to Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex space-x-2">
                <Button
                  onClick={handleUserReply}
                  isLoading={isReplying}
                  disabled={!replyText.trim()}
                >
                  Send Reply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ticket Actions for Agents - Available for all non-closed tickets */}
      {user?.role === 'agent' && currentTicket.status !== 'closed' && (
        <Card>
          <CardHeader>
            <CardTitle>Ticket Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Current Status: <Badge variant={statusColors[currentTicket.status as keyof typeof statusColors] || 'default'}>
                  {currentTicket.status.charAt(0).toUpperCase() + currentTicket.status.slice(1).replace('_', ' ')}
                </Badge>
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleCloseTicket}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Close Ticket
                </Button>
                {currentTicket.status === 'resolved' && (
                  <Button
                    onClick={handleReopenTicket}
                    variant="secondary"
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reopen for Review
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                • <strong>Close Ticket:</strong> Mark as fully resolved and close to new replies<br/>
                {currentTicket.status === 'resolved' && '• '}
                {currentTicket.status === 'resolved' && <strong>Reopen for Review:</strong>}
                {currentTicket.status === 'resolved' && ' Return to active status for further work'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reopen Button for Closed Tickets */}
      {user?.role === 'agent' && currentTicket.status === 'closed' && (
        <Card>
          <CardHeader>
            <CardTitle>Ticket Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleReopenTicket}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reopen Ticket
            </Button>
            <p className="text-sm text-gray-600 mt-2">
              Reopening this ticket will change its status to "waiting_human" and notify the customer.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reply Form */}
      {canReply && (
        <Card>
          <CardHeader>
            <CardTitle>Reply to Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleReply(false)}
                  isLoading={isReplying}
                  disabled={!replyText.trim()}
                >
                  Send Reply
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleReply(true)}
                  isLoading={isReplying}
                  disabled={!replyText.trim()}
                >
                  Send & Close
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Timeline</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAuditLogs(!showAuditLogs)}
              className="flex items-center gap-2"
            >
              {showAuditLogs ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show Details ({auditEvents.length} events)
                </>
              )}
            </Button>
          </div>
          {!showAuditLogs && auditEvents.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              Latest: {auditEvents[0]?.action} by {auditEvents[0]?.actor} at {new Date(auditEvents[0]?.timestamp).toLocaleString()}
            </div>
          )}
        </CardHeader>
        {showAuditLogs && (
          <CardContent>
            {auditEvents.length === 0 ? (
              <p className="text-gray-500">No audit events found</p>
            ) : (
              <div className="space-y-4">
                {auditEvents.map((event, index) => (
                  <div key={event._id || `audit-event-${index}`} className="flex space-x-4 pb-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full mt-2" />
                    <div className="flex-grow">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{event.action}</p>
                        <time className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleString()}
                        </time>
                      </div>
                      <p className="text-sm text-gray-600">by {event.actor}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        Trace ID: {event.traceId}
                      </p>
                      {event.meta && Object.keys(event.meta).length > 0 && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                          <details>
                            <summary className="cursor-pointer font-medium">View Metadata</summary>
                            <pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(event.meta, null, 2)}</pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};