import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
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
  Ticket,
  Activity,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { User as UserType } from '../types';

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
  const getUserId = (user: UserType | null): string => {
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
    <div className="min-h-screen bg-gray-50">
      {/* Clean Professional Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Activity className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">Agent Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <div className="text-sm text-gray-500">
                  {user.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Agent Configuration */}
        <div className="mb-8">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Agent Configuration</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
                  <Label htmlFor="agentId" className="block text-sm font-medium text-gray-700 mb-2">
                    Agent ID
                  </Label>
                  <Input
                    id="agentId"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    placeholder={getUserId(user) ? getUserId(user) : "Enter Agent ID"}
                    className="block w-full"
                  />
                </div>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="showAll" 
                    checked={showAll} 
                    onChange={(e) => setShowAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <Label htmlFor="showAll" className="ml-2 text-sm text-gray-700">
                    Show all agents
                  </Label>
                </div>
                
                <Button 
                  onClick={fetchDashboardData} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading
                    </>
                  ) : (
                    'Load Dashboard'
                  )}
                </Button>
              </div>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Content */}
        {dashboardData && (
          <>
            {/* Clean Metrics Grid */}
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Accepted</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {dashboardData.agentMetrics.acceptedTickets}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <XCircle className="h-5 w-5 text-red-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Rejected</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {dashboardData.agentMetrics.rejectedTickets}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Ticket className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Closed</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {dashboardData.agentMetrics.closedTickets}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Pending</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {dashboardData.agentMetrics.pendingTickets}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Clean Tabs Section */}
            <Card className="bg-white shadow-sm">
              <CardContent className="p-0">
                <Tabs defaultValue="agent-pending" className="w-full">
                  <div className="border-b border-gray-200">
                    <TabsList className="w-full justify-start p-0 bg-transparent">
                      <TabsTrigger 
                        value="agent-pending" 
                        className="px-6 py-4 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                      >
                        Pending ({dashboardData.agentMetrics.agentPendingTickets.filter(t => !t.ticketId?.agentSuggestion?.reviewed).length})
                      </TabsTrigger>
                      <TabsTrigger 
                        value="agent-accepted"
                        className="px-6 py-4 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                      >
                        Accepted ({dashboardData.agentMetrics.agentPendingTickets.filter(t => t.status === 'accepted').length})
                      </TabsTrigger>
                      <TabsTrigger 
                        value="agent-rejected"
                        className="px-6 py-4 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                      >
                        Rejected ({dashboardData.agentMetrics.agentPendingTickets.filter(t => t.status === 'rejected').length})
                      </TabsTrigger>
                      {showAll && (
                        <TabsTrigger 
                          value="all-agents"
                          className="px-6 py-4 data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none"
                        >
                          All Agents
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </div>

                  <TabsContent value="agent-pending" className="p-6">
                    {dashboardData.agentMetrics.agentPendingTickets.filter(pendingTicket => 
                      !pendingTicket.ticketId?.agentSuggestion?.reviewed
                    ).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                          <CheckCircle className="h-12 w-12" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No pending tickets</h3>
                        <p className="mt-1 text-sm text-gray-500">All tickets have been reviewed.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dashboardData.agentMetrics.agentPendingTickets
                          .filter(pendingTicket => !pendingTicket.ticketId?.agentSuggestion?.reviewed)
                          .map((pendingTicket: PendingTicketDetail) => (
                          <div key={pendingTicket._id} className="border border-gray-200 rounded-lg p-6">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-lg font-medium text-gray-900 truncate">
                                  {pendingTicket.ticketId?.title || 'Unknown Ticket'}
                                </h4>
                                <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                  <span>By: {pendingTicket.ticketId?.createdBy?.name || 'Unknown'}</span>
                                  <span>•</span>
                                  <span>{formatDate(pendingTicket.assignedAt)}</span>
                                </div>
                                
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                  <p className="text-sm font-medium text-gray-700 mb-2">Suggested Reply:</p>
                                  <p className="text-sm text-gray-600">{pendingTicket.originalReply}</p>
                                </div>
                              </div>
                              
                              <div className="ml-6 flex flex-col items-end space-y-3">
                                <Badge 
                                  variant={
                                    pendingTicket.confidence >= 0.8 ? 'success' :
                                    pendingTicket.confidence >= 0.6 ? 'warning' : 'danger'
                                  }
                                >
                                  {(pendingTicket.confidence * 100).toFixed(0)}% confidence
                                </Badge>
                                
                                {pendingTicket.status === 'pending' && (
                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleAgentResponse(pendingTicket.ticketId._id, 'accept')}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={() => handleAgentResponse(pendingTicket.ticketId._id, 'reject')}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="agent-accepted" className="p-6">
                    {dashboardData.agentMetrics.agentPendingTickets.filter(pendingTicket => 
                      pendingTicket.status === 'accepted'
                    ).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                          <CheckCircle className="h-12 w-12" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No accepted tickets</h3>
                        <p className="mt-1 text-sm text-gray-500">Accepted responses will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dashboardData.agentMetrics.agentPendingTickets
                          .filter(pendingTicket => pendingTicket.status === 'accepted')
                          .map((pendingTicket: PendingTicketDetail) => (
                          <div key={pendingTicket._id} className="border border-green-200 rounded-lg p-6 bg-green-50">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-lg font-medium text-gray-900 truncate">
                                  {pendingTicket.ticketId?.title || 'Unknown Ticket'}
                                </h4>
                                <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                  <span>By: {pendingTicket.ticketId?.createdBy?.name || 'Unknown'}</span>
                                  <span>•</span>
                                  <span>{formatDate(pendingTicket.respondedAt || pendingTicket.assignedAt)}</span>
                                </div>
                                
                                <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                                  <p className="text-sm font-medium text-green-700 mb-2">Accepted Response:</p>
                                  <p className="text-sm text-green-600">{pendingTicket.originalReply}</p>
                                </div>
                              </div>
                              
                              <div className="ml-6 flex flex-col items-end space-y-3">
                                <Badge variant="success">Accepted</Badge>
                                <Badge variant="secondary">
                                  {(pendingTicket.confidence * 100).toFixed(0)}% confidence
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="agent-rejected" className="p-6">
                    {dashboardData.agentMetrics.agentPendingTickets.filter(pendingTicket => 
                      pendingTicket.status === 'rejected'
                    ).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                          <XCircle className="h-12 w-12" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No rejected tickets</h3>
                        <p className="mt-1 text-sm text-gray-500">Rejected responses will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dashboardData.agentMetrics.agentPendingTickets
                          .filter(pendingTicket => pendingTicket.status === 'rejected')
                          .map((pendingTicket: PendingTicketDetail) => (
                          <div key={pendingTicket._id} className="border border-red-200 rounded-lg p-6 bg-red-50">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h4 className="text-lg font-medium text-gray-900 truncate">
                                  {pendingTicket.ticketId?.title || 'Unknown Ticket'}
                                </h4>
                                <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                  <span>By: {pendingTicket.ticketId?.createdBy?.name || 'Unknown'}</span>
                                  <span>•</span>
                                  <span>{formatDate(pendingTicket.respondedAt || pendingTicket.assignedAt)}</span>
                                </div>
                                
                                <div className="mt-4 p-4 bg-white rounded-lg border border-red-200">
                                  <p className="text-sm font-medium text-red-700 mb-2">Rejected Response:</p>
                                  <p className="text-sm text-red-600">{pendingTicket.originalReply}</p>
                                </div>
                              </div>
                              
                              <div className="ml-6 flex flex-col items-end space-y-3">
                                <Badge variant="danger">Rejected</Badge>
                                <Badge variant="secondary">
                                  {(pendingTicket.confidence * 100).toFixed(0)}% confidence
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  
                  {showAll && (
                    <TabsContent value="all-agents" className="p-6">
                      {!dashboardData.allPendingTickets || dashboardData.allPendingTickets.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="mx-auto h-12 w-12 text-gray-400">
                            <Users className="h-12 w-12" />
                          </div>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No agent activity</h3>
                          <p className="mt-1 text-sm text-gray-500">System-wide agent tickets will appear here.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {dashboardData.allPendingTickets.map((pendingTicket: PendingTicketDetail) => (
                            <div key={pendingTicket._id} className="border border-gray-200 rounded-lg p-6">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-lg font-medium text-gray-900 truncate">
                                    {pendingTicket.ticketId?.title || 'Unknown Ticket'}
                                  </h4>
                                  <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                    <span>By: {pendingTicket.ticketId?.createdBy?.name || 'Unknown'}</span>
                                    <span>•</span>
                                    <span>Agent: {pendingTicket.agentId}</span>
                                    <span>•</span>
                                    <span>{formatDate(pendingTicket.respondedAt || pendingTicket.assignedAt)}</span>
                                  </div>
                                  
                                  <div className={`mt-4 p-4 rounded-lg border ${
                                    pendingTicket.status === 'accepted' ? 'bg-green-50 border-green-200' : 
                                    pendingTicket.status === 'rejected' ? 'bg-red-50 border-red-200' : 
                                    'bg-gray-50 border-gray-200'
                                  }`}>
                                    <p className={`text-sm font-medium mb-2 ${
                                      pendingTicket.status === 'accepted' ? 'text-green-700' :
                                      pendingTicket.status === 'rejected' ? 'text-red-700' : 'text-gray-700'
                                    }`}>
                                      {pendingTicket.status === 'accepted' ? 'Accepted Response:' : 
                                       pendingTicket.status === 'rejected' ? 'Rejected Response:' : 'Suggested Response:'}
                                    </p>
                                    <p className={`text-sm ${
                                      pendingTicket.status === 'accepted' ? 'text-green-600' :
                                      pendingTicket.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                                    }`}>
                                      {pendingTicket.originalReply}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="ml-6 flex flex-col items-end space-y-3">
                                  <Badge variant={
                                    pendingTicket.status === 'accepted' ? 'success' : 
                                    pendingTicket.status === 'rejected' ? 'danger' : 'warning'
                                  }>
                                    {pendingTicket.status}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {(pendingTicket.confidence * 100).toFixed(0)}% confidence
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
