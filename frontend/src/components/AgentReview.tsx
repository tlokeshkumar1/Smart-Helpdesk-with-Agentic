import React, { useState } from 'react';
import { AgentSuggestion } from '../types';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Check, Edit, X, Send, MessageSquare, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AgentReviewProps {
  agentSuggestion: AgentSuggestion;
  onReview: (action: 'accept' | 'edit' | 'reject', options?: {
    editedReply?: string;
    feedback?: string;
    sendImmediately?: boolean;
    closeTicket?: boolean;
  }) => Promise<void>;
  isLoading?: boolean;
}

export const AgentReview: React.FC<AgentReviewProps> = ({
  agentSuggestion,
  onReview,
  isLoading = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReply, setEditedReply] = useState(agentSuggestion.draftReply);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [sendImmediately, setSendImmediately] = useState(false);
  const [closeTicket, setCloseTicket] = useState(false);

  const handleAccept = async () => {
    try {
      await onReview('accept', { 
        sendImmediately, 
        closeTicket,
        feedback: feedback.trim() || undefined 
      });
      toast.success(sendImmediately ? 'Draft accepted and sent!' : 'Draft accepted');
      resetForm();
    } catch {
      toast.error('Failed to accept draft');
    }
  };

  const handleEdit = async () => {
    if (!editedReply.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    try {
      await onReview('edit', { 
        editedReply,
        sendImmediately,
        closeTicket,
        feedback: feedback.trim() || undefined 
      });
      toast.success(sendImmediately ? 'Draft edited and sent!' : 'Draft edited');
      resetForm();
      setIsEditing(false);
    } catch {
      toast.error('Failed to edit draft');
    }
  };

  const handleReject = async () => {
    try {
      await onReview('reject', { 
        feedback: feedback.trim() || undefined 
      });
      toast.success('Draft rejected');
      resetForm();
    } catch {
      toast.error('Failed to reject draft');
    }
  };

  const resetForm = () => {
    setFeedback('');
    setShowFeedback(false);
    setSendImmediately(false);
    setCloseTicket(false);
    setEditedReply(agentSuggestion.draftReply);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Agent Suggestion
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Confidence:</span>
            <span className={`text-sm font-medium ${getConfidenceColor(agentSuggestion.confidence)}`}>
              {getConfidenceLevel(agentSuggestion.confidence)} ({Math.round(agentSuggestion.confidence * 100)}%)
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prediction Info */}
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm font-medium text-gray-700">Predicted Category: </span>
            <Badge variant="secondary">{agentSuggestion.predictedCategory}</Badge>
          </div>
          {agentSuggestion.confidence < 0.6 && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Low confidence - review carefully</span>
            </div>
          )}
        </div>

        {/* Draft Reply */}
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2">Suggested Reply:</h5>
          {isEditing ? (
            <textarea
              value={editedReply}
              onChange={(e) => setEditedReply(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Edit the suggested reply..."
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-800 whitespace-pre-wrap">
                {agentSuggestion.draftReply}
              </p>
            </div>
          )}
        </div>

        {/* Knowledge Base Citations */}
        {agentSuggestion.kbCitations && agentSuggestion.kbCitations.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Knowledge Base Citations:</h5>
            <div className="flex flex-wrap gap-2">
              {agentSuggestion.kbCitations.map((citation: string, index: number) => (
                <Badge key={index} variant="default">
                  {citation}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Action Options */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sendImmediately}
                onChange={(e) => setSendImmediately(e.target.checked)}
                className="rounded"
              />
              Send immediately after review
            </label>
          </div>

          {sendImmediately && (
            <div className="flex items-center gap-2 mb-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={closeTicket}
                  onChange={(e) => setCloseTicket(e.target.checked)}
                  className="rounded"
                />
                Close ticket after sending
              </label>
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showFeedback ? 'Hide' : 'Add'} feedback (optional)
            </button>
          </div>

          {showFeedback && (
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Add feedback about this AI suggestion (optional)..."
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {!isEditing ? (
            <>
              <Button
                onClick={handleAccept}
                isLoading={isLoading}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Accept {sendImmediately && '& Send'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                isLoading={isLoading}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleEdit}
                isLoading={isLoading}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Save {sendImmediately && '& Send'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditing(false);
                  setEditedReply(agentSuggestion.draftReply);
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
