import { create } from 'zustand';
import { Config } from '../types';
import api from '../lib/api';

interface ConfigState {
  config: Config | null;
  isLoading: boolean;
  
  fetchConfig: () => Promise<void>;
  updateConfig: (config: Config) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  isLoading: false,

  fetchConfig: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/config');
      set({ config: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateConfig: async (config: Config) => {
    try {
      const response = await api.put('/config', config);
      set({ config: response.data });
    } catch (error) {
      throw error;
    }
  },
}));