import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../stores/auth';
import api from '../lib/api';

// Mock the API
jest.mock('../lib/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
    });
    
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAuthStore());
    
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.refreshToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles successful login', async () => {
    const mockResponse = {
      data: {
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        user: { id: '1', email: 'test@example.com', role: 'user' as const },
      },
    };

    mockedApi.post.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.user).toEqual(mockResponse.data.user);
    expect(result.current.token).toBe('mock-token');
    expect(result.current.refreshToken).toBe('mock-refresh-token');
    expect(result.current.isLoading).toBe(false);
  });

  it('handles login failure', async () => {
    const mockError = new Error('Login failed');
    mockedApi.post.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useAuthStore());

    await expect(async () => {
      await act(async () => {
        await result.current.login('test@example.com', 'wrong-password');
      });
    }).rejects.toThrow('Login failed');

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles logout correctly', () => {
    const { result } = renderHook(() => useAuthStore());

    // Set initial state
    act(() => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', role: 'user' },
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.refreshToken).toBeNull();
  });

  it('handles successful registration', async () => {
    const mockResponse = {
      data: {
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        user: { id: '1', email: 'test@example.com', role: 'user' as const },
      },
    };

    mockedApi.post.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.register('test@example.com', 'password', 'Test User');
    });

    expect(result.current.user).toEqual(mockResponse.data.user);
    expect(result.current.token).toBe('mock-token');
    expect(result.current.refreshToken).toBe('mock-refresh-token');
  });
});