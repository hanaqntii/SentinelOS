import { create } from "zustand";
import { settingsApi } from "@/services/api";
import { DEFAULT_GEOFENCE, DEFAULT_THRESHOLDS } from "@/lib/constants";
import type { GeofenceConfig, ThresholdConfig } from "@/types";

interface SettingsState {
  thresholds: ThresholdConfig;
  geofence: GeofenceConfig;
  isLoading: boolean;
  fetchThresholds: () => Promise<void>;
  updateThresholds: (input: ThresholdConfig) => Promise<void>;
  updateGeofence: (input: GeofenceConfig) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  thresholds: DEFAULT_THRESHOLDS,
  geofence: DEFAULT_GEOFENCE,
  isLoading: false,
  fetchThresholds: async () => {
    set({ isLoading: true });
    const response = await settingsApi.getRuntimeConfig();
    set({
      thresholds: response.data.thresholds,
      geofence: response.data.geofence,
      isLoading: false
    });
  },
  updateThresholds: async (input) => {
    set({ isLoading: true });
    const response = await settingsApi.updateThresholds(input);
    set({ thresholds: response.data, isLoading: false });
  },
  updateGeofence: async (input) => {
    set({ isLoading: true });
    const response = await settingsApi.updateGeofence(input);
    set({ geofence: response.data, isLoading: false });
  }
}));
