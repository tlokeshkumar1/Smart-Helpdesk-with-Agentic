import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useTicketsStore } from '../stores/tickets';
import { useAuthStore } from '../stores/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ticketSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().optional(),
  attachments: z.array(z.object({ value: z.string().url('Please enter valid URLs') })).min(0),
});

type TicketForm = z.infer<typeof ticketSchema>;

export const CreateTicket: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createTicket, isLoading } = useTicketsStore();
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TicketForm>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      attachments: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'attachments',
  });

  // If user is not a 'user' role, show access denied
  if (user?.role !== 'user') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tickets')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Only users can create tickets. Agents and administrators can view and manage existing tickets.
              </p>
              <Button onClick={() => navigate('/tickets')}>
                View Tickets
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = async (data: TicketForm) => {
    // Convert attachments to array of strings before sending
    const ticketData = {
      ...data,
      attachments: data.attachments.map((a) => a.value),
    };
    try {
      await createTicket(ticketData);
      toast.success('Ticket created successfully!');
      navigate('/tickets');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create ticket';
      toast.error(errorMessage);
    }
  };

  const addAttachment = () => {
    if (newAttachmentUrl.trim()) {
      try {
        new URL(newAttachmentUrl);
        append({ value: newAttachmentUrl });
        setNewAttachmentUrl('');
      } catch {
        toast.error('Please enter a valid URL');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/tickets')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Ticket</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Input
              {...register('title')}
              label="Title *"
              placeholder="Brief description of your issue"
              error={errors.title?.message}
            />

            <Input
              {...register('category')}
              label="Category"
              placeholder="e.g., Technical, Billing, General"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Description *
              </label>
              <textarea
                {...register('description')}
                placeholder="Provide detailed information about your issue"
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Attachments (URLs)
              </label>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <Input
                      {...register(`attachments.${index}.value` as const)}
                      placeholder="https://example.com/file.pdf"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Input
                    value={newAttachmentUrl}
                    onChange={(e) => setNewAttachmentUrl(e.target.value)}
                    placeholder="Enter URL (e.g., https://example.com/image.jpg)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAttachment}
                    disabled={!newAttachmentUrl.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Add links to files stored in cloud storage, screenshots, or other relevant resources.
              </p>
            </div>

            <div className="flex space-x-4">
              <Button
                type="submit"
                isLoading={isLoading}
              >
                Create Ticket
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/tickets')}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};