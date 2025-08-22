import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTicketsStore } from '../stores/tickets';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { AgentReview } from '../components/AgentReview';
import { ArrowLeft, Clock, User, Tag, RotateCcw } from 'lucide-react';
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
    isLoading, 
    fetchTicket, 
    fetchAuditEvents,
    replyToTicket,
    reviewDraft,
    reopenTicket
  } = useTicketsStore();

  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    if (id) {
      const loadTicket = async () => {
        try {
          await fetchTicket(id);
          await fetchAuditEvents(id);
        } catch {
          toast.error('Failed to load ticket');
          navigate('/tickets');
        }
      };
      loadTicket();
    }
  }, [id, fetchTicket, fetchAuditEvents, navigate]);

  const handleReply = async (closeAfter = false) => {
    if (!id || !replyText.trim()) return;

    setIsReplying(true);
    try {
      await replyToTicket(id, replyText, closeAfter);
      setReplyText('');
      toast.success(closeAfter ? 'Reply sent and ticket closed' : 'Reply sent');
      await fetchAuditEvents(id);
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
    } finally {
      setIsReviewing(false);
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

  const canReply = user?.role !== 'user' && 
    ['triaged', 'assigned', 'waiting_human'].includes(currentTicket.status);

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Agent Suggestion */}
      {agentSuggestion && user?.role !== 'user' && currentTicket.status === 'waiting_human' && (
        <AgentReview
          agentSuggestion={agentSuggestion}
          onReview={handleReviewDraft}
          isLoading={isReviewing}
        />
      )}

      {/* Reopen Button for Closed Tickets */}
      {user?.role !== 'user' && currentTicket.status === 'closed' && (
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
          <CardTitle>Audit Timeline</CardTitle>
        </CardHeader>
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
                      <div className="mt-2 text-xs text-gray-500">
                        {JSON.stringify(event.meta, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};