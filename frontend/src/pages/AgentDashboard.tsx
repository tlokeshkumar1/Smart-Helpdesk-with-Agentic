import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Users,
  Ticket
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { User } from '../types';

interface TicketInfo {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdBy?: {
    name: string;
    email: string;
  };
  agentSuggestion?: {
    predictedCategory: string;
    confidence: number;
    draftReply: string;
    kbCitations: string[];
    autoClosed: boolean;
    reviewed?: boolean;
    reviewResult?: 'accepted' | 'edited' | 'rejected' | null;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
  };
}

interface PendingTicketDetail {
  _id: string;
  ticketId: TicketInfo;
  agentId: string;
  agentName: string;
  originalReply: string;
  confidence: number;
  status: string;
  assignedAt: string;
  respondedAt?: string;
}

interface AgentMetrics {
  agentId: string;
  acceptedTickets: number;
  rejectedTickets: number;
  closedTickets: number;
  pendingTickets: number;
  agentPendingTickets: PendingTicketDetail[];
}

interface DashboardData {
  pendingTickets: TicketInfo[];
  totalPending: number;
  agentMetrics: AgentMetrics;
  allPendingTickets?: PendingTicketDetail[];
}

export default function AgentDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const { token, user } = useAuthStore();
  const [agentId, setAgentId] = useState(''); // Start empty, will be set when user loads
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Helper function to get user ID (handles both _id and id properties)
  const getUserId = (user: User | null): string => {
    if (!user) return '';
    return user._id || (user as { id?: string }).id || '';
  };

  const fetchDashboardData = useCallback(async () => {
    if (!agentId.trim()) {
      setError('Please enter an Agent ID');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/agent/dashboard?agentId=${agentId}&showAll=${showAll}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error && 'response' in err && err.response && 
        typeof err.response === 'object' && 'data' in err.response && 
        err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data
        ? (err.response.data as { message: string }).message
        : 'Failed to fetch dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [agentId, token, showAll]);

  const handleAgentResponse = async (ticketId: string, action: 'accept' | 'reject') => {
    try {
      const payload = {
        action,
        sendImmediately: false,
        closeTicket: false,
        feedback: `Agent ${action}ed from dashboard`
      };

      await api.post(`/tickets/${ticketId}/review-draft`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh dashboard data after successful action
      await fetchDashboardData();
    } catch (err) {
      const errorMessage = err instanceof Error && 'response' in err && err.response && 
        typeof err.response === 'object' && 'data' in err.response && 
        err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data
        ? (err.response.data as { message: string }).message
        : `Failed to ${action} ticket`;
      setError(errorMessage);
    }
  };

  useEffect(() => {
    if (agentId && agentId.trim()) {
      fetchDashboardData();
    }
  }, [agentId, fetchDashboardData, showAll]);

  // Update agentId when user data becomes available
  useEffect(() => {
    const userId = getUserId(user);
    if (userId && !agentId) {
      setAgentId(userId);
    }
  }, [user, agentId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor agent performance and manage ticket assignments
          </p>
        </div>
      </div>

      {/* Agent ID Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agent Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="agentId">Agent ID</Label>
              <Input
                id="agentId"
                value={agentId}
                onChange={(e) => {
                  setAgentId(e.target.value);
                }}
                placeholder={getUserId(user) ? `Use your ID: ${getUserId(user)}` : "Enter Agent ID"}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="showAll" 
                checked={showAll} 
                onChange={(e) => setShowAll(e.target.checked)}
                className="mr-1"
              />
              <Label htmlFor="showAll">Show all pending tickets</Label>
            </div>
            <Button 
              onClick={() => {
                const userIdToUse = getUserId(user);
                setAgentId(userIdToUse);
              }} 
              variant="outline"
              disabled={!getUserId(user)}
            >
              Use My ID
            </Button>
            <Button 
              onClick={() => {
                const bobsId = '68aad0cdbd7bc53f23ab9ad6';
                setAgentId(bobsId);
              }} 
              variant="outline"
            >
              Use Bob's ID
            </Button>
            <Button onClick={() => {
              fetchDashboardData();
            }} disabled={loading}>
              {loading ? 'Loading...' : 'Load Dashboard'}
            </Button>
          </div>
          {user && (
            <p className="text-sm text-muted-foreground mt-2">
              Logged in as: {user.name} ({getUserId(user)})
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Dashboard Content */}
      {dashboardData && (
        <>
          {/* Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accepted Tickets</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dashboardData.agentMetrics.acceptedTickets}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tickets accepted by agent
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejected Tickets</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardData.agentMetrics.rejectedTickets}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tickets rejected by agent
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Closed Tickets</CardTitle>
                <Ticket className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {dashboardData.agentMetrics.closedTickets}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tickets resolved and closed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Tickets</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {dashboardData.agentMetrics.pendingTickets}
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting agent response
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="agent-pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="agent-pending">Agent Pending Tickets</TabsTrigger>
              <TabsTrigger value="agent-accepted">Agent Accepted Tickets</TabsTrigger>
              <TabsTrigger value="agent-rejected">Agent Rejected Tickets</TabsTrigger>
              {showAll && <TabsTrigger value="all-agents">All Agents' Tickets</TabsTrigger>}
            </TabsList>

            {/* Agent Pending Tickets */}
            <TabsContent value="agent-pending">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Tickets Pending Agent Response
                  </CardTitle>
                  <CardDescription>
                    Tickets specifically assigned to agent {agentId} awaiting acceptance or rejection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardData.agentMetrics.agentPendingTickets.filter(pendingTicket => 
                    !pendingTicket.ticketId?.agentSuggestion?.reviewed
                  ).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No pending tickets for this agent
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.agentMetrics.agentPendingTickets
                        .filter(pendingTicket => !pendingTicket.ticketId?.agentSuggestion?.reviewed)
                        .map((pendingTicket: PendingTicketDetail) => (
                        <div key={pendingTicket._id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold">
                                {pendingTicket.ticketId?.title || 'Unknown Ticket'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Created by: {pendingTicket.ticketId?.createdBy?.name || 'Unknown'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Assigned: {formatDate(pendingTicket.assignedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                Confidence: {(pendingTicket.confidence * 100).toFixed(0)}%
                              </Badge>
                              <Badge variant="secondary">
                                {pendingTicket.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="bg-muted/50 rounded p-3">
                            <p className="text-sm font-medium mb-1">Suggested Reply:</p>
                            <p className="text-sm">{pendingTicket.originalReply}</p>
                          </div>

                          {pendingTicket.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAgentResponse(
                                  pendingTicket.ticketId._id,
                                  'accept'
                                )}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleAgentResponse(
                                  pendingTicket.ticketId._id,
                                  'reject'
                                )}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Agent Accepted Tickets */}
            <TabsContent value="agent-accepted">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Accepted Tickets
                  </CardTitle>
                  <CardDescription>
                    Tickets accepted by agent {agentId}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardData.agentMetrics.agentPendingTickets.filter(pendingTicket => 
                    pendingTicket.status === 'accepted'
                  ).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No accepted tickets yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.agentMetrics.agentPendingTickets
                        .filter(pendingTicket => pendingTicket.status === 'accepted')
                        .map((pendingTicket: PendingTicketDetail) => (
                        <div key={pendingTicket._id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold">
                                {pendingTicket.ticketId?.title || 'Unknown Ticket'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Created by: {pendingTicket.ticketId?.createdBy?.name || 'Unknown'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Accepted: {formatDate(pendingTicket.respondedAt || pendingTicket.assignedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="success">Accepted</Badge>
                              <Badge variant="secondary">
                                Confidence: {(pendingTicket.confidence * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="bg-green-50 rounded p-3">
                            <p className="text-sm font-medium mb-1">Accepted Reply:</p>
                            <p className="text-sm">{pendingTicket.originalReply}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Agent Rejected Tickets */}
            <TabsContent value="agent-rejected">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Rejected Tickets
                  </CardTitle>
                  <CardDescription>
                    Tickets rejected by agent {agentId}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardData.agentMetrics.agentPendingTickets.filter(pendingTicket => 
                    pendingTicket.status === 'rejected'
                  ).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No rejected tickets yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.agentMetrics.agentPendingTickets
                        .filter(pendingTicket => pendingTicket.status === 'rejected')
                        .map((pendingTicket: PendingTicketDetail) => (
                        <div key={pendingTicket._id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold">
                                {pendingTicket.ticketId?.title || 'Unknown Ticket'}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Created by: {pendingTicket.ticketId?.createdBy?.name || 'Unknown'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Rejected: {formatDate(pendingTicket.respondedAt || pendingTicket.assignedAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="danger">Rejected</Badge>
                              <Badge variant="secondary">
                                Confidence: {(pendingTicket.confidence * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="bg-red-50 rounded p-3">
                            <p className="text-sm font-medium mb-1">Rejected Reply:</p>
                            <p className="text-sm">{pendingTicket.originalReply}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* All Agents' Tickets */}
            {showAll && (
              <TabsContent value="all-agents">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      All Agents' Tickets
                    </CardTitle>
                    <CardDescription>
                      View tickets from all agents across the system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!dashboardData.allPendingTickets || dashboardData.allPendingTickets.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No agent tickets found in the system
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {dashboardData.allPendingTickets.map((pendingTicket: PendingTicketDetail) => (
                          <div key={pendingTicket._id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <h3 className="font-semibold">
                                  {pendingTicket.ticketId?.title || 'Unknown Ticket'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Created by: {pendingTicket.ticketId?.createdBy?.name || 'Unknown'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Agent ID: {pendingTicket.agentId}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {pendingTicket.status === 'accepted' ? 'Accepted' : 
                                   pendingTicket.status === 'rejected' ? 'Rejected' : 'Pending'}: 
                                  {formatDate(pendingTicket.respondedAt || pendingTicket.assignedAt)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  pendingTicket.status === 'accepted' ? 'success' : 
                                  pendingTicket.status === 'rejected' ? 'danger' : 'secondary'
                                }>
                                  {pendingTicket.status}
                                </Badge>
                                <Badge variant="secondary">
                                  Confidence: {(pendingTicket.confidence * 100).toFixed(0)}%
                                </Badge>
                              </div>
                            </div>
                            
                            <div className={`rounded p-3 ${
                              pendingTicket.status === 'accepted' ? 'bg-green-50' : 
                              pendingTicket.status === 'rejected' ? 'bg-red-50' : 'bg-muted/50'
                            }`}>
                              <p className="text-sm font-medium mb-1">
                                {pendingTicket.status === 'accepted' ? 'Accepted Reply' : 
                                 pendingTicket.status === 'rejected' ? 'Rejected Reply' : 'Suggested Reply'}:
                              </p>
                              <p className="text-sm">{pendingTicket.originalReply}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}
