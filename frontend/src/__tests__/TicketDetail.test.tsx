import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TicketDetail } from '../pages/TicketDetail';
import { useTicketsStore } from '../stores/tickets';
import { useAuthStore } from '../stores/auth';

jest.mock('../stores/tickets');
jest.mock('../stores/auth');

const mockFetchTicket = jest.fn();
const mockFetchAuditEvents = jest.fn();
const mockReplyToTicket = jest.fn();

const mockUseTicketsStore = useTicketsStore as jest.MockedFunction<typeof useTicketsStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

const mockTicket = {
  id: '1',
  title: 'Test Ticket',
  description: 'This is a test ticket description',
  category: 'Technical',
  status: 'waiting_human' as const,
  assignee: 'agent@example.com',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T12:00:00Z',
  userId: 'user1',
};

const mockAgentSuggestion = {
  predictedCategory: 'Technical',
  confidence: 0.85,
  draftReply: 'This appears to be a technical issue. Please try the following steps...',
  kbCitations: ['KB-001', 'KB-002'],
};

const mockAuditEvents = [
  {
    id: '1',
    timestamp: '2023-01-01T00:00:00Z',
    actor: 'system',
    action: 'Ticket created',
    meta: { source: 'web' },
    traceId: 'trace-123',
  },
  {
    id: '2',
    timestamp: '2023-01-01T01:00:00Z',
    actor: 'ai-agent',
    action: 'Category predicted',
    meta: { category: 'Technical', confidence: 0.85 },
    traceId: 'trace-124',
  },
];

const renderTicketDetail = () => {
  return render(
    <BrowserRouter>
      <TicketDetail />
    </BrowserRouter>
  );
};

describe('TicketDetail Component', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({
      user: { id: 'agent1', email: 'agent@example.com', role: 'agent' },
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      setToken: jest.fn(),
      refresh: jest.fn(),
    });

    mockUseTicketsStore.mockReturnValue({
      tickets: [],
      currentTicket: mockTicket,
      agentSuggestion: mockAgentSuggestion,
      auditEvents: mockAuditEvents,
      isLoading: false,
      filters: { mine: false },
      fetchTickets: jest.fn(),
      fetchTicket: mockFetchTicket,
      createTicket: jest.fn(),
      replyToTicket: mockReplyToTicket,
      setFilters: jest.fn(),
      fetchAuditEvents: mockFetchAuditEvents,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders ticket details correctly', () => {
    renderTicketDetail();
    
    expect(screen.getByText('Test Ticket')).toBeInTheDocument();
    expect(screen.getByText('This is a test ticket description')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('WAITING HUMAN')).toBeInTheDocument();
    expect(screen.getByText('agent@example.com')).toBeInTheDocument();
  });

  it('displays agent suggestion with confidence bar', () => {
    renderTicketDetail();
    
    expect(screen.getByText('AI Agent Suggestion')).toBeInTheDocument();
    expect(screen.getByText('Predicted Category:')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('This appears to be a technical issue. Please try the following steps...')).toBeInTheDocument();
    expect(screen.getByText('KB-001')).toBeInTheDocument();
    expect(screen.getByText('KB-002')).toBeInTheDocument();
  });

  it('shows audit timeline with events', () => {
    renderTicketDetail();
    
    expect(screen.getByText('Audit Timeline')).toBeInTheDocument();
    expect(screen.getByText('Ticket created')).toBeInTheDocument();
    expect(screen.getByText('Category predicted')).toBeInTheDocument();
    expect(screen.getByText('trace-123')).toBeInTheDocument();
    expect(screen.getByText('trace-124')).toBeInTheDocument();
  });

  it('allows agent to reply to ticket', async () => {
    mockReplyToTicket.mockResolvedValueOnce({});
    renderTicketDetail();
    
    const textarea = screen.getByPlaceholderText('Type your reply here...');
    const sendButton = screen.getByText('Send Reply');
    
    fireEvent.change(textarea, { target: { value: 'This is my reply' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockReplyToTicket).toHaveBeenCalledWith('1', 'This is my reply', false);
    });
  });

  it('allows agent to send reply and close ticket', async () => {
    mockReplyToTicket.mockResolvedValueOnce({});
    renderTicketDetail();
    
    const textarea = screen.getByPlaceholderText('Type your reply here...');
    const sendAndCloseButton = screen.getByText('Send & Close');
    
    fireEvent.change(textarea, { target: { value: 'Final reply' } });
    fireEvent.click(sendAndCloseButton);

    await waitFor(() => {
      expect(mockReplyToTicket).toHaveBeenCalledWith('1', 'Final reply', true);
    });
  });
});