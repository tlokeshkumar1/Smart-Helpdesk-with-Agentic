import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const { token } = useAuthStore.getState();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const { refreshToken, logout, setToken } = useAuthStore.getState();
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
            refreshToken,
          });
          
          const { token } = response.data;
          setToken(token);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          logout();
          toast.error('Session expired. Please login again.');
          return Promise.reject(refreshError);
        }
      } else {
        console.warn('No refresh token available');
        logout();
        toast.error('Session expired. Please login again.');
      }
    }

    // Handle other errors
    if (error.response?.status === 400) {
      console.error('Bad Request Error:', {
        url: error.config?.url,
        method: error.config?.method,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

export default api;