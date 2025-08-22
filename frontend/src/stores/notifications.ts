import { create } from 'zustand';
import api from '../lib/api';

interface Notification {
  _id: string;
  userId: string;
  type: 'ticket_created' | 'ticket_assigned' | 'ticket_replied' | 'ticket_closed';
  message: string;
  ticketId?: string;
  metadata: Record<string, string | number | boolean>;
  timestamp: string;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  pollNotifications: () => void;
  stopPolling: () => void;
}

let pollInterval: NodeJS.Timeout | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get('/notifications');
      const { notifications, unreadCount } = response.data;
      
      set({ 
        notifications,
        unreadCount,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      
      set(state => ({
        notifications: state.notifications.map(n => 
          n._id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.put('/notifications/read-all');
      
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  pollNotifications: () => {
    if (pollInterval) return;
    
    // Poll every 30 seconds
    pollInterval = setInterval(() => {
      get().fetchNotifications();
    }, 30000);
    
    // Initial fetch
    get().fetchNotifications();
  },

  stopPolling: () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  },
}));
