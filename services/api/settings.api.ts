import { withLatency } from "@/services/api/mock-utils";
import { mockDb } from "@/services/api/mock-db";
import type { GeofenceConfig, ThresholdConfig, User, UserRole } from "@/types";

export const settingsApi = {
  async getRuntimeConfig() {
    return withLatency<{ thresholds: ThresholdConfig; geofence: GeofenceConfig }>({
      thresholds: mockDb.thresholds,
      geofence: mockDb.geofence
    });
  },

  async getThresholds() {
    return withLatency<ThresholdConfig>(mockDb.thresholds);
  },

  async updateThresholds(input: ThresholdConfig) {
    mockDb.thresholds = input;
    return withLatency<ThresholdConfig>(mockDb.thresholds);
  },

  async updateGeofence(input: GeofenceConfig) {
    mockDb.geofence = input;
    return withLatency<GeofenceConfig>(mockDb.geofence);
  },

  async listUsers() {
    return withLatency<User[]>([...mockDb.users]);
  },

  async updateUserRole(userId: string, role: UserRole) {
    const user = mockDb.users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    user.role = role;
    return withLatency<User>(user);
  }
};
