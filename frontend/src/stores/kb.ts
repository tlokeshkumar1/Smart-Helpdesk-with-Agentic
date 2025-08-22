import { create } from 'zustand';
import { KBArticle } from '../types';
import api from '../lib/api';

interface KBState {
  articles: KBArticle[];
  currentArticle: KBArticle | null;
  searchQuery: string;
  isLoading: boolean;
  
  fetchArticles: (query?: string) => Promise<void>;
  fetchArticle: (id: string) => Promise<void>;
  createArticle: (data: Omit<KBArticle, '_id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateArticle: (id: string, data: Partial<KBArticle>) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  toggleArticleStatus: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useKBStore = create<KBState>((set, get) => ({
  articles: [],
  currentArticle: null,
  searchQuery: '',
  isLoading: false,

  fetchArticles: async (query?: string) => {
    set({ isLoading: true });
    try {
      const params = query ? `?query=${encodeURIComponent(query)}` : '';
      const response = await api.get(`/kb${params}`);
      set({ articles: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchArticle: async (id: string) => {
    if (!id || id === 'undefined' || id === 'new' || id.trim() === '') {
      throw new Error('Invalid article ID');
    }
    set({ isLoading: true });
    try {
      const response = await api.get(`/kb/${id}`);
      set({ currentArticle: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createArticle: async (data) => {
    const response = await api.post('/kb', data);
    const { articles } = get();
    set({ articles: [response.data, ...articles] });
  },

  updateArticle: async (id: string, data) => {
    if (!id || id === 'undefined' || id === 'new') {
      throw new Error('Invalid article ID');
    }
    const response = await api.put(`/kb/${id}`, data);
    const { articles } = get();
    const updatedArticles = articles.map(article => 
      article._id === id ? response.data : article
    );
    set({ articles: updatedArticles });
  },

  deleteArticle: async (id: string) => {
    if (!id || id === 'undefined' || id === 'new') {
      throw new Error('Invalid article ID');
    }
    await api.delete(`/kb/${id}`);
    const { articles } = get();
    const filteredArticles = articles.filter(article => article._id !== id);
    set({ articles: filteredArticles });
  },

  toggleArticleStatus: async (id: string) => {
    if (!id || id === 'undefined' || id === 'new') {
      throw new Error('Invalid article ID');
    }
    const response = await api.patch(`/kb/${id}/toggle-status`);
    const { articles } = get();
    const updatedArticles = articles.map(article => 
      article._id === id ? response.data : article
    );
    set({ articles: updatedArticles });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },
}));