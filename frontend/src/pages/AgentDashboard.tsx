import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Users,
  Ticket
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';

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
}

interface AgentMetrics {
  agentId: string;
  acceptedTickets: number;
  closedTickets: number;
  pendingTickets: number;
  agentPendingTickets: PendingTicketDetail[];
}

interface DashboardData {
  pendingTickets: TicketInfo[];
  totalPending: number;
  agentMetrics: AgentMetrics;
}

export default function AgentDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [agentId, setAgentId] = useState('68a8843eee879abdb97a5db0'); // Default agent ID
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuthStore();

  const fetchDashboardData = useCallback(async () => {
    if (!agentId.trim()) {
      setError('Please enter an Agent ID');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/agent/dashboard?agentId=${agentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      const errorMessage = err instanceof Error && 'response' in err && err.response && 
        typeof err.response === 'object' && 'data' in err.response && 
        err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data
        ? (err.response.data as { message: string }).message
        : 'Failed to fetch dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [agentId, token]);

  const handleAgentResponse = async (ticketId: string, action: 'accept' | 'reject', originalData: PendingTicketDetail) => {
    try {
      const payload = {
        ticketId,
        action,
        agentId,
        agentName: originalData.agentName,
        originalReply: originalData.originalReply,
        confidence: originalData.confidence,
        willSendImmediately: false,
        willCloseTicket: false,
        traceId: `trace-${Date.now()}`
      };

      await api.post('/agent/respond-to-draft', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh dashboard data
      fetchDashboardData();
    } catch (err) {
      console.error(`Failed to ${action} ticket:`, err);
      const errorMessage = err instanceof Error && 'response' in err && err.response && 
        typeof err.response === 'object' && 'data' in err.response && 
        err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data
        ? (err.response.data as { message: string }).message
        : `Failed to ${action} ticket`;
      setError(errorMessage);
    }
  };

  useEffect(() => {
    if (agentId) {
      fetchDashboardData();
    }
  }, [agentId, fetchDashboardData]);

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
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="Enter Agent ID (e.g., 68a8843eee879abdb97a5db0)"
                className="mt-1"
              />
            </div>
            <Button onClick={fetchDashboardData} disabled={loading}>
              {loading ? 'Loading...' : 'Load Dashboard'}
            </Button>
          </div>
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
                <Activity className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {dashboardData.totalPending}
                </div>
                <p className="text-xs text-muted-foreground">
                  All pending tickets
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different views */}
          <Tabs defaultValue="agent-pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="agent-pending">Agent Pending Tickets</TabsTrigger>
              <TabsTrigger value="all-pending">All Pending Tickets</TabsTrigger>
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
                  {dashboardData.agentMetrics.agentPendingTickets.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No pending tickets for this agent
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.agentMetrics.agentPendingTickets.map((pendingTicket: PendingTicketDetail) => (
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
                                  'accept',
                                  pendingTicket
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
                                  'reject',
                                  pendingTicket
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

            {/* All Pending Tickets */}
            <TabsContent value="all-pending">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    All Pending Tickets
                  </CardTitle>
                  <CardDescription>
                    All tickets in the system that need attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardData.pendingTickets.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No pending tickets in the system
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.pendingTickets.map((ticket: TicketInfo) => (
                        <div key={ticket._id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold">{ticket.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                Created by: {ticket.createdBy?.name || 'Unknown'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Category: {ticket.category}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{ticket.status}</Badge>
                              {ticket.agentSuggestion && (
                                <Badge variant="secondary">
                                  AI Suggested ({(ticket.agentSuggestion.confidence * 100).toFixed(0)}%)
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm">{ticket.description}</p>
                          
                          {ticket.agentSuggestion && (
                            <div className="bg-muted/50 rounded p-3 mt-2">
                              <p className="text-sm font-medium mb-1">AI Suggested Reply:</p>
                              <p className="text-sm">{ticket.agentSuggestion.draftReply}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
