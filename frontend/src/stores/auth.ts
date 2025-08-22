import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import api from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: () => boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, role?: string) => Promise<void>;
  logout: () => void;
  setToken: (token: string) => void;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { token, refreshToken, user } = response.data;
          
          set({ 
            user, 
            token, 
            refreshToken, 
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name?: string, role?: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/register', { email, password, name, role });
          const { token, refreshToken, user } = response.data;
          
          set({ 
            user, 
            token, 
            refreshToken, 
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ 
          user: null, 
          token: null, 
          refreshToken: null 
        });
      },

      setToken: (token: string) => {
        set({ token });
      },

      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        
        const response = await api.post('/auth/refresh', { refreshToken });
        const { token } = response.data;
        set({ token });
      },

      isAuthenticated: () => {
        const { user, token } = get();
        return !!(user && token);
      },

      initialize: async () => {
        const { user, token, refreshToken, refresh, logout } = get();
        
        // If we have a user and refreshToken but no token, try to refresh
        if (user && refreshToken && !token) {
          try {
            await refresh();
          } catch (error) {
            console.error('Failed to refresh token on initialization:', error);
            logout();
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user 
      }),
    }
  )
);