import { create } from "zustand";
import { alertApi } from "@/services/api";
import type { Alert, AlertSeverity } from "@/types";

interface AlertState {
  alerts: Alert[];
  unreadCount: number;
  isLoading: boolean;
  fetchAlerts: (severity?: AlertSeverity) => Promise<void>;
  acknowledge: (alertId: string) => Promise<void>;
  pushAlert: (alert: Alert) => void;
}

const countUnread = (alerts: Alert[]) => alerts.filter((entry) => !entry.acknowledged).length;

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  unreadCount: 0,
  isLoading: false,
  fetchAlerts: async (severity) => {
    set({ isLoading: true });
    const response = await alertApi.list(severity);
    set({ alerts: response.data, unreadCount: countUnread(response.data), isLoading: false });
  },
  acknowledge: async (alertId) => {
    const response = await alertApi.acknowledge(alertId);
    const next = get().alerts.map((entry) =>
      entry.id === response.data.id ? response.data : entry
    );
    set({ alerts: next, unreadCount: countUnread(next) });
  },
  pushAlert: (alert) => {
    const hasSimilarOpenAlert = get().alerts.some(
      (entry) =>
        entry.deviceId === alert.deviceId &&
        entry.type === alert.type &&
        entry.severity === alert.severity &&
        !entry.acknowledged
    );

    if (hasSimilarOpenAlert) {
      return;
    }

    const next = [alert, ...get().alerts];
    set({ alerts: next, unreadCount: countUnread(next) });
  }
}));
