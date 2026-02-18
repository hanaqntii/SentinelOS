import { withLatency } from "@/services/api/mock-utils";
import { mockDb } from "@/services/api/mock-db";
import { nowIso } from "@/lib/time";
import type { Device, DeviceStatus } from "@/types";

export interface DeviceFilters {
  search?: string;
  status?: DeviceStatus;
}

export const deviceApi = {
  async list(filters?: DeviceFilters) {
    let devices = [...mockDb.devices];

    if (filters?.search) {
      const keyword = filters.search.toLowerCase();
      devices = devices.filter((device) => device.name.toLowerCase().includes(keyword));
    }

    if (filters?.status) {
      devices = devices.filter((device) => device.status === filters.status);
    }

    return withLatency<Device[]>(devices);
  },

  async getById(deviceId: string) {
    const device = mockDb.devices.find((entry) => entry.id === deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    return withLatency<Device>(device);
  },

  async register(input: Omit<Device, "id" | "lastSeen">) {
    const newDevice: Device = {
      ...input,
      id: `dev-${String(mockDb.devices.length + 1).padStart(3, "0")}`,
      lastSeen: nowIso()
    };

    mockDb.devices.push(newDevice);
    mockDb.organization.devices.push(newDevice.id);

    return withLatency<Device>(newDevice);
  }
};
