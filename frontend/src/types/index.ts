export interface User {
  _id: string;
  email: string;
  role: 'admin' | 'agent' | 'user';
  name?: string;
}

export interface Ticket {
  _id: string;
  title: string;
  description: string;
  category?: string;
  status: 'open' | 'triaged' | 'assigned' | 'waiting_human' | 'resolved' | 'closed';
  attachments?: string[]; // Array of URLs
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  createdBy?: string | User; // Can be populated or just the ID
}

export interface AgentSuggestion {
  predictedCategory: string;
  confidence: number;
  draftReply: string;
  kbCitations: string[];
  reviewed?: boolean;
  reviewResult?: 'accepted' | 'edited' | 'rejected' | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export interface AuditEvent {
  _id: string;
  timestamp: string;
  actor: string;
  action: string;
  meta: Record<string, unknown>;
  traceId: string;
}

export interface TicketReply {
  _id: string;
  content: string;
  author?: {
    _id: string;
    name?: string;
    email: string;
    role: string;
  };
  authorType: 'user' | 'agent' | 'system';
  isInternal: boolean;
  attachments?: string[];
  citations?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KBArticle {
  _id: string;
  title: string;
  body: string;
  tags: string[];
  status: 'unpublish' | 'publish';
  createdAt: string;
  updatedAt: string;
}

export interface Config {
  autoCloseEnabled: boolean;
  confidenceThreshold: number;
  slaHours: number;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface TicketCreateResponse {
  ticket: Ticket;
  traceId: string;
}