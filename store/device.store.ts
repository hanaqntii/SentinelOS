import { create } from "zustand";
import { deviceApi } from "@/services/api";
import type { Device, DeviceStatus } from "@/types";

interface DeviceState {
  devices: Device[];
  selectedDeviceId: string | null;
  isLoading: boolean;
  fetchDevices: (filters?: { search?: string; status?: DeviceStatus }) => Promise<void>;
  selectDevice: (deviceId: string | null) => void;
  upsertDevice: (device: Device) => void;
  updateDeviceRuntime: (input: {
    deviceId: string;
    status?: DeviceStatus;
    lastSeen?: string;
    batteryLevel?: number;
  }) => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  selectedDeviceId: null,
  isLoading: false,
  fetchDevices: async (filters) => {
    set({ isLoading: true });
    const response = await deviceApi.list(filters);
    set({ devices: response.data, isLoading: false });
  },
  selectDevice: (deviceId) => set({ selectedDeviceId: deviceId }),
  upsertDevice: (device) =>
    set((state) => {
      const hasDevice = state.devices.some((entry) => entry.id === device.id);
      if (!hasDevice) {
        return { devices: [device, ...state.devices] };
      }

      return {
        devices: state.devices.map((entry) => (entry.id === device.id ? device : entry))
      };
    }),
  updateDeviceRuntime: ({ deviceId, status, lastSeen, batteryLevel }) =>
    set((state) => ({
      devices: state.devices.map((entry) =>
        entry.id === deviceId
          ? {
              ...entry,
              status: status ?? entry.status,
              lastSeen: lastSeen ?? entry.lastSeen,
              batteryLevel: batteryLevel ?? entry.batteryLevel
            }
          : entry
      )
    }))
}));
