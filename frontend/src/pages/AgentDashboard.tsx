import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Card, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  CheckCircle,
  Clock,
  XCircle,
  Users,
  Ticket,
  Activity,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import api from "../lib/api";
import { useAuthStore } from "../stores/auth";
import { User as UserType } from "../types";

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
    reviewResult?: "accepted" | "edited" | "rejected" | null;
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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const { token, user } = useAuthStore();
  const [agentId, setAgentId] = useState(""); // Start empty, will be set when user loads
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Helper function to get user ID (handles both _id and id properties)
  const getUserId = (user: UserType | null): string => {
    if (!user) return "";
    return user._id || (user as { id?: string }).id || "";
  };

  const fetchDashboardData = useCallback(async () => {
    if (!agentId.trim()) {
      setError("Please enter an Agent ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/agent/dashboard?agentId=${agentId}&showAll=${showAll}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setDashboardData(response.data);
    } catch (err) {
      const errorMessage =
        err instanceof Error &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
          ? (err.response.data as { message: string }).message
          : "Failed to fetch dashboard data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [agentId, token, showAll]);

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    open: boolean;
    ticket: PendingTicketDetail | null;
    action: "accept" | "reject" | null;
    reply: string;
  }>({ open: false, ticket: null, action: null, reply: "" });

  // Open edit modal
  const openEditModal = (
    ticket: PendingTicketDetail,
    action: "accept" | "reject"
  ) => {
    setEditModal({ open: true, ticket, action, reply: ticket.originalReply });
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModal({ open: false, ticket: null, action: null, reply: "" });
  };

  // Handle agent response (accept/reject) with edit
  const handleAgentResponse = async () => {
    if (!editModal.ticket || !editModal.action) return;
    try {
      const agent = user;
      const payload = {
        ticketId: editModal.ticket.ticketId._id,
        action: editModal.action,
        agentId: agent?._id || "",
        agentName: agent?.name || "",
        originalReply: editModal.reply,
        confidence: editModal.ticket.confidence,
        willSendImmediately: false,
        willCloseTicket: false,
        traceId: uuidv4(),
      };
      await api.post("/agent/respond-to-draft", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      closeEditModal();
      await fetchDashboardData();
    } catch (err) {
      const errorMessage =
        err instanceof Error &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
          ? (err.response.data as { message: string }).message
          : `Failed to ${editModal.action} ticket`;
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
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
                <h1 className="text-xl font-semibold text-gray-900">
                  Agent Dashboard
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && <div className="text-sm text-gray-500">{user.name}</div>}
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
                <h2 className="text-lg font-medium text-gray-900">
                  Agent Configuration
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
                  <Label
                    htmlFor="agentId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Agent ID
                  </Label>
                  <Input
                    id="agentId"
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    placeholder={
                      getUserId(user) ? getUserId(user) : "Enter Agent ID"
                    }
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
                  <Label
                    htmlFor="showAll"
                    className="ml-2 text-sm text-gray-700"
                  >
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
                    "Load Dashboard"
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
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Performance Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="relative">
                      <span className="absolute top-0 right-0 mt-2 mr-2 group">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 text-gray-600 text-xs font-bold cursor-pointer">i</span>
                        <span className="absolute left-6 top-1 z-10 hidden group-hover:block bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 shadow-lg w-48">Tickets you have accepted so far.</span>
                      </span>
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-500 mr-2">Accepted</p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {dashboardData.agentMetrics.acceptedTickets}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="relative">
                      <span className="absolute top-0 right-0 mt-2 mr-2 group">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 text-gray-600 text-xs font-bold cursor-pointer">i</span>
                        <span className="absolute left-6 top-1 z-10 hidden group-hover:block bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 shadow-lg w-48">Tickets you have rejected so far.</span>
                      </span>
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center">
                            <XCircle className="h-5 w-5 text-red-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-500 mr-2">Rejected</p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {dashboardData.agentMetrics.rejectedTickets}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="relative">
                      <span className="absolute top-0 right-0 mt-2 mr-2 group">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 text-gray-600 text-xs font-bold cursor-pointer">i</span>
                        <span className="absolute left-6 top-1 z-10 hidden group-hover:block bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 shadow-lg w-48">Tickets that have been resolved and closed.</span>
                      </span>
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Ticket className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-500 mr-2">Closed</p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {dashboardData.agentMetrics.closedTickets}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="relative">
                      <span className="absolute top-0 right-0 mt-2 mr-2 group">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 text-gray-600 text-xs font-bold cursor-pointer">i</span>
                        <span className="absolute left-6 top-1 z-10 hidden group-hover:block bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 shadow-lg w-48">Tickets that are still awaiting your response.</span>
                      </span>
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Clock className="h-5 w-5 text-orange-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-500 mr-2">Pending</p>
                          <p className="text-2xl font-semibold text-gray-900">
                            {dashboardData.agentMetrics.pendingTickets}
                          </p>
                        </div>
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
                        className="px-6 py-4 font-bold text-orange-700 rounded-t data-[state=active]:border-t-4 data-[state=active]:border-orange-500 data-[state=active]:bg-orange-50 hover:bg-orange-200 hover:text-orange-900"
                      >
                        Pending (
                        {
                          dashboardData.agentMetrics.agentPendingTickets.filter(
                            (t) => Array.isArray(t.status) ? t.status.includes("pending") : t.status === "pending"
                          ).length
                        }
                        )
                      </TabsTrigger>
                      <TabsTrigger
                        value="agent-accepted"
                        className="px-6 py-4 font-bold text-green-700 rounded-t data-[state=active]:border-t-4 data-[state=active]:border-green-500 data-[state=active]:bg-green-50 hover:bg-green-200 hover:text-green-900"
                      >
                        Accepted (
                        {
                          dashboardData.agentMetrics.agentPendingTickets.filter(
                            (t) => Array.isArray(t.status) ? t.status.includes("accepted") : t.status === "accepted"
                          ).length
                        }
                        )
                      </TabsTrigger>
                      <TabsTrigger
                        value="agent-rejected"
                        className="px-6 py-4 font-bold text-red-700 rounded-t data-[state=active]:border-t-4 data-[state=active]:border-red-500 data-[state=active]:bg-red-50 hover:bg-red-200 hover:text-red-900"
                      >
                        Rejected (
                        {
                          dashboardData.agentMetrics.agentPendingTickets.filter(
                            (t) => Array.isArray(t.status) ? t.status.includes("rejected") : t.status === "rejected"
                          ).length
                        }
                        )
                      </TabsTrigger>
                      <TabsTrigger
                        value="agent-closed"
                        className="px-6 py-4 font-bold text-blue-700 rounded-t data-[state=active]:border-t-4 data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50 hover:bg-blue-200 hover:text-blue-900"
                      >
                        Closed (
                        {
                          dashboardData.agentMetrics.agentPendingTickets.filter(
                            (t) => Array.isArray(t.status) ? t.status.includes("closed") : t.status === "closed"
                          ).length
                        }
                        )
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
                    {dashboardData.agentMetrics.agentPendingTickets.filter(
                      (pendingTicket) => Array.isArray(pendingTicket.status) ? pendingTicket.status.includes("pending") : pendingTicket.status === "pending"
                    ).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                          <CheckCircle className="h-12 w-12" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          No pending tickets
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          All tickets have been processed.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dashboardData.agentMetrics.agentPendingTickets
                          .filter(
                            (pendingTicket) => Array.isArray(pendingTicket.status) ? pendingTicket.status.includes("pending") : pendingTicket.status === "pending"
                          )
                          .map((pendingTicket: PendingTicketDetail) => (
                            <div
                              key={pendingTicket._id}
                              className="border border-gray-200 rounded-lg p-6"
                            >
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-lg font-medium text-gray-900 truncate">
                                    {pendingTicket.ticketId?.title ||
                                      "Unknown Ticket"}
                                  </h4>
                                  <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                    <span>
                                      By:{" "}
                                      {pendingTicket.ticketId?.createdBy
                                        ?.name || "Unknown"}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {formatDate(pendingTicket.assignedAt)}
                                    </span>
                                  </div>

                                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                      Suggested Reply:
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {pendingTicket.originalReply}
                                    </p>
                                  </div>
                                </div>

                                <div className="ml-6 flex flex-col items-end space-y-3">
                                  <Badge
                                    variant={
                                      Array.isArray(pendingTicket.status)
                                        ? pendingTicket.status.includes("pending")
                                          ? "warning"
                                          : pendingTicket.status.includes("accepted")
                                            ? "success"
                                            : pendingTicket.status.includes("rejected")
                                              ? "danger"
                                              : pendingTicket.status.includes("closed")
                                                ? "default"
                                                : "secondary"
                                        : pendingTicket.status === "pending"
                                          ? "warning"
                                          : pendingTicket.status === "accepted"
                                            ? "success"
                                            : pendingTicket.status === "rejected"
                                              ? "danger"
                                              : pendingTicket.status === "closed"
                                                ? "default"
                                                : "secondary"
                                    }
                                  >
                                    {Array.isArray(pendingTicket.status)
                                      ? pendingTicket.status.map((s, idx) => (
                                          <span key={s}>
                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                            {idx < pendingTicket.status.length - 1 ? ", " : ""}
                                          </span>
                                        ))
                                      : pendingTicket.status.charAt(0).toUpperCase() + pendingTicket.status.slice(1)}
                                  </Badge>
                                  <Badge variant="secondary">
                                    {(pendingTicket.confidence * 100).toFixed(
                                      0
                                    )}
                                    % confidence
                                  </Badge>

                                  {(Array.isArray(pendingTicket.status)
                                    ? pendingTicket.status.includes("pending") &&
                                      !pendingTicket.status.includes("accepted") &&
                                      !pendingTicket.status.includes("rejected")
                                    : pendingTicket.status === "pending") && (
                                    <div className="flex space-x-2">
                                      <Button
                                        size="sm"
                                        onClick={() =>
                                          openEditModal(pendingTicket, "accept")
                                        }
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() =>
                                          openEditModal(pendingTicket, "reject")
                                        }
                                      >
                                        Reject
                                      </Button>
                                    </div>
                                  )}
                                  {/* Edit Modal */}
                                  {editModal.open && editModal.ticket && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                                      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
                                        <h3 className="text-lg font-semibold mb-4">
                                          {editModal.action === "accept"
                                            ? "Accept"
                                            : "Reject"}{" "}
                                          Ticket
                                        </h3>
                                        <div className="mb-4">
                                          <Label
                                            htmlFor="edit-reply"
                                            className="block text-sm font-medium text-gray-700 mb-2"
                                          >
                                            Edit Reply
                                          </Label>
                                          <textarea
                                            id="edit-reply"
                                            className="w-full border border-gray-300 rounded-md p-2 min-h-[100px]"
                                            value={editModal.reply}
                                            onChange={(e) =>
                                              setEditModal((modal) => ({
                                                ...modal,
                                                reply: e.target.value,
                                              }))
                                            }
                                          />
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                          <Button
                                            onClick={closeEditModal}
                                            variant="secondary"
                                          >
                                            Cancel
                                          </Button>
                                          <Button
                                            onClick={handleAgentResponse}
                                            className={
                                              editModal.action === "accept"
                                                ? "bg-green-600 hover:bg-green-700"
                                                : ""
                                            }
                                            {...(editModal.action === "reject"
                                              ? { variant: "danger" }
                                              : {})}
                                          >
                                            {editModal.action === "accept"
                                              ? "Accept"
                                              : "Reject"}
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="agent-closed" className="p-6">
                    {dashboardData.agentMetrics.agentPendingTickets.filter(
                      (pendingTicket) => Array.isArray(pendingTicket.status) ? pendingTicket.status.includes("closed") : pendingTicket.status === "closed"
                    ).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                          <Ticket className="h-12 w-12" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          No closed tickets
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Closed tickets will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dashboardData.agentMetrics.agentPendingTickets
                          .filter(
                            (pendingTicket) => Array.isArray(pendingTicket.status) ? pendingTicket.status.includes("closed") : pendingTicket.status === "closed"
                          )
                          .map((pendingTicket: PendingTicketDetail) => (
                            <div
                              key={pendingTicket._id}
                              className="border border-blue-200 rounded-lg p-6 bg-blue-50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-lg font-medium text-gray-900 truncate">
                                    {pendingTicket.ticketId?.title ||
                                      "Unknown Ticket"}
                                  </h4>
                                  <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                    <span>
                                      By:{" "}
                                      {pendingTicket.ticketId?.createdBy
                                        ?.name || "Unknown"}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {formatDate(
                                        pendingTicket.respondedAt ||
                                          pendingTicket.assignedAt
                                      )}
                                    </span>
                                  </div>
                                  <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
                                    <p className="text-sm font-medium text-blue-700 mb-2">
                                      Closed Response:
                                    </p>
                                    <p className="text-sm text-blue-600">
                                      {pendingTicket.originalReply}
                                    </p>
                                  </div>
                                </div>
                                <div className="ml-6 flex flex-col items-end space-y-3">
                                  <Badge variant="default">Closed</Badge>
                                  <Badge variant="secondary">
                                    {(pendingTicket.confidence * 100).toFixed(
                                      0
                                    )}
                                    % confidence
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="agent-accepted" className="p-6">
                    {dashboardData.agentMetrics.agentPendingTickets.filter(
                      (pendingTicket) => Array.isArray(pendingTicket.status) ? pendingTicket.status.includes("accepted") : pendingTicket.status === "accepted"
                    ).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                          <CheckCircle className="h-12 w-12" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          No accepted tickets
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Accepted responses will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dashboardData.agentMetrics.agentPendingTickets
                          .filter(
                            (pendingTicket) => Array.isArray(pendingTicket.status) ? pendingTicket.status.includes("accepted") : pendingTicket.status === "accepted"
                          )
                          .map((pendingTicket: PendingTicketDetail) => (
                            <div
                              key={pendingTicket._id}
                              className="border border-green-200 rounded-lg p-6 bg-green-50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-lg font-medium text-gray-900 truncate">
                                    {pendingTicket.ticketId?.title ||
                                      "Unknown Ticket"}
                                  </h4>
                                  <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                    <span>
                                      By:{" "}
                                      {pendingTicket.ticketId?.createdBy
                                        ?.name || "Unknown"}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {formatDate(
                                        pendingTicket.respondedAt ||
                                          pendingTicket.assignedAt
                                      )}
                                    </span>
                                  </div>

                                  <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                                    <p className="text-sm font-medium text-green-700 mb-2">
                                      Accepted Response:
                                    </p>
                                    <p className="text-sm text-green-600">
                                      {pendingTicket.originalReply}
                                    </p>
                                  </div>
                                </div>

                                <div className="ml-6 flex flex-col items-end space-y-3">
                                  <Badge variant="success">Accepted</Badge>
                                  <Badge variant="secondary">
                                    {(pendingTicket.confidence * 100).toFixed(
                                      0
                                    )}
                                    % confidence
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="agent-rejected" className="p-6">
                    {dashboardData.agentMetrics.agentPendingTickets.filter(
                      (pendingTicket) => Array.isArray(pendingTicket.status) ? pendingTicket.status.includes("rejected") : pendingTicket.status === "rejected"
                    ).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-400">
                          <XCircle className="h-12 w-12" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          No rejected tickets
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          Rejected responses will appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dashboardData.agentMetrics.agentPendingTickets
                          .filter(
                            (pendingTicket) => Array.isArray(pendingTicket.status) ? pendingTicket.status.includes("rejected") : pendingTicket.status === "rejected"
                          )
                          .map((pendingTicket: PendingTicketDetail) => (
                            <div
                              key={pendingTicket._id}
                              className="border border-red-200 rounded-lg p-6 bg-red-50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-lg font-medium text-gray-900 truncate">
                                    {pendingTicket.ticketId?.title ||
                                      "Unknown Ticket"}
                                  </h4>
                                  <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                    <span>
                                      By:{" "}
                                      {pendingTicket.ticketId?.createdBy
                                        ?.name || "Unknown"}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {formatDate(
                                        pendingTicket.respondedAt ||
                                          pendingTicket.assignedAt
                                      )}
                                    </span>
                                  </div>

                                  <div className="mt-4 p-4 bg-white rounded-lg border border-red-200">
                                    <p className="text-sm font-medium text-red-700 mb-2">
                                      Rejected Response:
                                    </p>
                                    <p className="text-sm text-red-600">
                                      {pendingTicket.originalReply}
                                    </p>
                                  </div>
                                </div>

                                <div className="ml-6 flex flex-col items-end space-y-3">
                                  <Badge variant="danger">Rejected</Badge>
                                  <Badge variant="secondary">
                                    {(pendingTicket.confidence * 100).toFixed(
                                      0
                                    )}
                                    % confidence
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
                      {!dashboardData.allPendingTickets ||
                      dashboardData.allPendingTickets.length === 0 ? (
                        <div className="text-center py-12">
                          <div className="mx-auto h-12 w-12 text-gray-400">
                            <Users className="h-12 w-12" />
                          </div>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">
                            No agent activity
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            System-wide agent tickets will appear here.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {dashboardData.allPendingTickets.map(
                            (pendingTicket: PendingTicketDetail) => (
                              <div
                                key={pendingTicket._id}
                                className="border border-gray-200 rounded-lg p-6"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-lg font-medium text-gray-900 truncate">
                                      {pendingTicket.ticketId?.title ||
                                        "Unknown Ticket"}
                                    </h4>
                                    <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                      <span>
                                        By:{" "}
                                        {pendingTicket.ticketId?.createdBy
                                          ?.name || "Unknown"}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        Agent: {pendingTicket.agentId}
                                      </span>
                                      <span>•</span>
                                      <span>
                                        {formatDate(
                                          pendingTicket.respondedAt ||
                                            pendingTicket.assignedAt
                                        )}
                                      </span>
                                    </div>

                                    <div
                                      className={`mt-4 p-4 rounded-lg border ${
                                        pendingTicket.status === "accepted"
                                          ? "bg-green-50 border-green-200"
                                          : pendingTicket.status === "rejected"
                                          ? "bg-red-50 border-red-200"
                                          : "bg-gray-50 border-gray-200"
                                      }`}
                                    >
                                      <p
                                        className={`text-sm font-medium mb-2 ${
                                          pendingTicket.status === "accepted"
                                            ? "text-green-700"
                                            : pendingTicket.status ===
                                              "rejected"
                                            ? "text-red-700"
                                            : "text-gray-700"
                                        }`}
                                      >
                                        {pendingTicket.status === "accepted"
                                          ? "Accepted Response:"
                                          : pendingTicket.status === "rejected"
                                          ? "Rejected Response:"
                                          : "Suggested Response:"}
                                      </p>
                                      <p
                                        className={`text-sm ${
                                          pendingTicket.status === "accepted"
                                            ? "text-green-600"
                                            : pendingTicket.status ===
                                              "rejected"
                                            ? "text-red-600"
                                            : "text-gray-600"
                                        }`}
                                      >
                                        {pendingTicket.originalReply}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="ml-6 flex flex-col items-end space-y-3">
                                    <Badge
                                      variant={
                                        pendingTicket.status === "accepted"
                                          ? "success"
                                          : pendingTicket.status === "rejected"
                                          ? "danger"
                                          : "warning"
                                      }
                                    >
                                      {pendingTicket.status}
                                    </Badge>
                                    <Badge variant="secondary">
                                      {(pendingTicket.confidence * 100).toFixed(
                                        0
                                      )}
                                      % confidence
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
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
