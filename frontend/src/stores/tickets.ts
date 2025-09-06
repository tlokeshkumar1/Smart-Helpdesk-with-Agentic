import { create } from 'zustand';
import { Ticket, AgentSuggestion, AuditEvent, TicketReply } from '../types';
import api from '../lib/api';

interface TicketsState {
  tickets: Ticket[];
  currentTicket: Ticket | null;
  agentSuggestion: AgentSuggestion | null;
  auditEvents: AuditEvent[];
  replies: TicketReply[];
  isLoading: boolean;
  filters: {
    status?: string;
    mine: boolean;
  };
  
  fetchTickets: () => Promise<void>;
  fetchTicket: (id: string) => Promise<void>;
  createTicket: (data: { title: string; description: string; category?: string; attachments?: string[] }) => Promise<void>;
  replyToTicket: (id: string, reply: string, close?: boolean) => Promise<void>;
  userReplyToTicket: (id: string, reply: string, attachments?: string[]) => Promise<void>;
  reviewDraft: (id: string, action: 'accept' | 'edit' | 'reject', options?: {
    editedReply?: string;
    feedback?: string;
    sendImmediately?: boolean;
    closeTicket?: boolean;
  }) => Promise<unknown>;
  reopenTicket: (id: string, reason?: string) => Promise<void>;
  closeTicket: (id: string, reason?: string) => Promise<void>;
  setFilters: (filters: Partial<TicketsState['filters']>) => void;
  fetchAuditEvents: (ticketId: string) => Promise<void>;
  fetchReplies: (ticketId: string) => Promise<void>;
}

export const useTicketsStore = create<TicketsState>((set, get) => ({
  tickets: [],
  currentTicket: null,
  agentSuggestion: null,
  auditEvents: [],
  replies: [],
  isLoading: false,
  filters: {
    mine: false,
  },

  fetchTickets: async () => {
    set({ isLoading: true });
    try {
      const { filters } = get();
      const params = new URLSearchParams();
      
      if (filters.status) params.set('status', filters.status);
      if (filters.mine) params.set('mine', 'true');
      
      const response = await api.get(`/tickets?${params}`);
      set({ tickets: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchTicket: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/tickets/${id}`);
      const ticket = response.data;
      
      // Check if there's an agent suggestion
      let agentSuggestion = null;
      if (ticket.agentSuggestion) {
        agentSuggestion = ticket.agentSuggestion;
      }
      
      set({ 
        currentTicket: ticket, 
        agentSuggestion,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createTicket: async (data) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/tickets', data);
      const { tickets } = get();
      set({ 
        tickets: [response.data.ticket, ...tickets], 
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  replyToTicket: async (id: string, reply: string, close = false) => {
    await api.post(`/tickets/${id}/reply`, { reply, close });
    // Refresh the ticket after reply
    await get().fetchTicket(id);
  },

  userReplyToTicket: async (id: string, reply: string, attachments?: string[]) => {
    await api.post(`/tickets/${id}/user-reply`, { reply, attachments });
    // Refresh the ticket and replies after user reply
    await get().fetchTicket(id);
    await get().fetchReplies(id);
  },

  reviewDraft: async (id: string, action: 'accept' | 'edit' | 'reject', options?: {
    editedReply?: string;
    feedback?: string;
    sendImmediately?: boolean;
    closeTicket?: boolean;
  }) => {
    try {
      const response = await api.post(`/tickets/${id}/review-draft`, {
        action,
        editedReply: options?.editedReply,
        feedback: options?.feedback,
        sendImmediately: options?.sendImmediately || false,
        closeTicket: options?.closeTicket || false
      });

      // Refresh the ticket after review
      await get().fetchTicket(id);
      await get().fetchAuditEvents(id);
      await get().fetchReplies(id); // Refresh replies to show new agent reply

      return response.data;
    } catch (error) {
      console.error('Error in reviewDraft:', error);
      throw error;
    }
  },

  reopenTicket: async (id: string, reason?: string) => {
    await api.post(`/tickets/${id}/reopen`, { reason });
    // Refresh the ticket after reopening
    await get().fetchTicket(id);
    await get().fetchAuditEvents(id);
  },

  closeTicket: async (id: string, reason?: string) => {
  await api.post(`/tickets/${id}/close`, { close: true, reason });
    // Refresh the ticket after closing
    await get().fetchTicket(id);
    await get().fetchAuditEvents(id);
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }));
  },

  fetchAuditEvents: async (ticketId: string) => {
    const response = await api.get(`/tickets/${ticketId}/audit`);
    set({ auditEvents: response.data.timeline || [] });
  },

  fetchReplies: async (ticketId: string) => {
    const response = await api.get(`/tickets/${ticketId}/replies`);
    set({ replies: response.data.replies || [] });
  },
}));