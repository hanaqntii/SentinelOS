import { create } from "zustand";
import { telemetryApi } from "@/services/api";
import type { Telemetry } from "@/types";

interface TelemetryState {
  byDevice: Record<string, Telemetry[]>;
  lastUpdatedAt: string | null;
  ingestTelemetry: (telemetry: Telemetry) => void;
  fetchTelemetry: (deviceId: string, limit?: number) => Promise<void>;
  clearTelemetry: (deviceId?: string) => void;
}

const MAX_POINTS_PER_DEVICE = 200;

export const useTelemetryStore = create<TelemetryState>((set) => ({
  byDevice: {},
  lastUpdatedAt: null,
  ingestTelemetry: (telemetry) =>
    set((state) => {
      const current = state.byDevice[telemetry.deviceId] ?? [];
      const next = [telemetry, ...current].slice(0, MAX_POINTS_PER_DEVICE);

      return {
        byDevice: {
          ...state.byDevice,
          [telemetry.deviceId]: next
        },
        lastUpdatedAt: telemetry.timestamp
      };
    }),
  fetchTelemetry: async (deviceId, limit = 100) => {
    const response = await telemetryApi.list({ deviceId, limit });

    set((state) => ({
      byDevice: {
        ...state.byDevice,
        [deviceId]: response.data
      },
      lastUpdatedAt: new Date().toISOString()
    }));
  },
  clearTelemetry: (deviceId) =>
    set((state) => {
      if (!deviceId) {
        return { byDevice: {}, lastUpdatedAt: null };
      }

      const clone = { ...state.byDevice };
      delete clone[deviceId];
      return { byDevice: clone };
    })
}));
