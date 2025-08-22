// Test API connectivity and authentication
import api from '../lib/api';
import { useAuthStore } from '../stores/auth';

export const debugAuth = () => {
  const { token, user, refreshToken, isAuthenticated } = useAuthStore.getState();
  
  console.log('=== AUTH DEBUG INFO ===');
  console.log('User:', user);
  console.log('Token exists:', !!token);
  console.log('Refresh token exists:', !!refreshToken);
  console.log('Is authenticated:', isAuthenticated());
  console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
  console.log('LocalStorage auth-storage:', localStorage.getItem('auth-storage'));
  
  return {
    user,
    hasToken: !!token,
    hasRefreshToken: !!refreshToken,
    isAuthenticated: isAuthenticated(),
    tokenPreview: token ? token.substring(0, 20) + '...' : 'No token',
  };
};

export const testAPI = async () => {
  const { token, user, isAuthenticated } = useAuthStore.getState();
  
  console.log('=== API DEBUG INFO ===');
  console.log('User:', user);
  console.log('Token exists:', !!token);
  console.log('Is authenticated:', isAuthenticated());
  console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
  
  try {
    // Test health endpoint (no auth required)
    console.log('Testing health endpoint...');
    const healthResponse = await fetch('/api/health');
    console.log('Health status:', healthResponse.status);
    
    if (token) {
      // Test authenticated endpoint
      console.log('Testing authenticated endpoint...');
      const response = await api.get('/tickets');
      console.log('Tickets response status:', response.status);
      console.log('Tickets response:', response.data);
      
      // Test notifications endpoint
      console.log('Testing notifications endpoint...');
      const notifResponse = await api.get('/notifications');
      console.log('Notifications response status:', notifResponse.status);
      console.log('Notifications response:', notifResponse.data);
    } else {
      console.log('No token available for authenticated tests');
    }
  } catch (error) {
    console.error('API test failed:', error);
    if (error instanceof Error && 'response' in error) {
      const axiosError = error as { response: { status: number; data: unknown } };
      console.error('Response status:', axiosError.response.status);
      console.error('Response data:', axiosError.response.data);
    }
  }
};

// Add to window for easy access in console
if (typeof window !== 'undefined') {
  (window as typeof window & { 
    testAPI: typeof testAPI;
    debugAuth: typeof debugAuth;
  }).testAPI = testAPI;
  (window as typeof window & { 
    testAPI: typeof testAPI;
    debugAuth: typeof debugAuth;
  }).debugAuth = debugAuth;
}
