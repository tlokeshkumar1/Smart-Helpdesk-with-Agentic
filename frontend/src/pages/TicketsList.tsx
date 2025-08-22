import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTicketsStore } from '../stores/tickets';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { Plus, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColors = {
  open: 'secondary',
  triaged: 'secondary', 
  assigned: 'warning',
  waiting_human: 'danger',
  resolved: 'success',
  closed: 'success',
} as const;

export const TicketsList: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    tickets, 
    isLoading, 
    filters, 
    fetchTickets, 
    setFilters 
  } = useTicketsStore();

  useEffect(() => {
    const loadTickets = async () => {
      try {
        await fetchTickets();
      } catch (error: unknown) {
        console.error('Error loading tickets:', error);
        toast.error('Failed to load tickets');
      }
    };
    loadTickets();
  }, [filters, fetchTickets]);

  const handleFilterChange = (key: keyof typeof filters, value: string | boolean | undefined) => {
    setFilters({ [key]: value });
  };

  if (isLoading && !tickets.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Tickets</h1>
          <LoadingSkeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <LoadingSkeleton lines={5} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
        {user?.role === 'user' && (
          <Link to="/tickets/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="waiting_human">Waiting Human</option>
              <option value="closed">Closed</option>
            </select>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={filters.mine}
                onChange={(e) => handleFilterChange('mine', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">My tickets only</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {tickets.length} Ticket{tickets.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No tickets found</p>
              {user?.role === 'user' && (
                <Link to="/tickets/new" className="mt-4 inline-block">
                  <Button>Create your first ticket</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Title</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Category</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-900">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket, index) => (
                    <tr key={ticket._id || `ticket-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <Link 
                          to={`/tickets/${ticket._id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {ticket.title}
                        </Link>
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {ticket.category || 'Uncategorized'}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={statusColors[ticket.status]}>
                          {ticket.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {new Date(ticket.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};