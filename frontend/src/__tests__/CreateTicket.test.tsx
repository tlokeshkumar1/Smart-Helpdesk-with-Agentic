import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CreateTicket } from '../pages/CreateTicket';
import { useTicketsStore } from '../stores/tickets';

jest.mock('../stores/tickets');

const mockCreateTicket = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockUseTicketsStore = useTicketsStore as jest.MockedFunction<typeof useTicketsStore>;

const renderCreateTicket = () => {
  return render(
    <BrowserRouter>
      <CreateTicket />
    </BrowserRouter>
  );
};

describe('CreateTicket Component', () => {
  beforeEach(() => {
    mockUseTicketsStore.mockReturnValue({
      tickets: [],
      currentTicket: null,
      agentSuggestion: null,
      auditEvents: [],
      isLoading: false,
      filters: { mine: false },
      fetchTickets: jest.fn(),
      fetchTicket: jest.fn(),
      createTicket: mockCreateTicket,
      replyToTicket: jest.fn(),
      setFilters: jest.fn(),
      fetchAuditEvents: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders create ticket form correctly', () => {
    renderCreateTicket();
    
    expect(screen.getByText('Create New Ticket')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create ticket/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    renderCreateTicket();
    
    const submitButton = screen.getByRole('button', { name: /create ticket/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });
  });

  it('creates ticket with valid data', async () => {
    mockCreateTicket.mockResolvedValueOnce({});
    renderCreateTicket();
    
    const titleInput = screen.getByLabelText(/title/i);
    const categoryInput = screen.getByLabelText(/category/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const submitButton = screen.getByRole('button', { name: /create ticket/i });
    
    fireEvent.change(titleInput, { target: { value: 'Test Ticket' } });
    fireEvent.change(categoryInput, { target: { value: 'Technical' } });
    fireEvent.change(descriptionInput, { target: { value: 'This is a test description' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTicket).toHaveBeenCalledWith({
        title: 'Test Ticket',
        category: 'Technical',
        description: 'This is a test description',
      });
    });
  });
});