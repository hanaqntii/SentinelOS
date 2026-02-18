import { DEFAULT_GEOFENCE, DEFAULT_THRESHOLDS } from "@/lib/constants";
import { nowIso } from "@/lib/time";
import type {
  Alert,
  Device,
  Organization,
  Telemetry,
  ThresholdConfig,
  GeofenceConfig,
  User
} from "@/types";

const initialDevices: Device[] = [
  {
    id: "dev-001",
    name: "Worker A - Wearable",
    status: "online",
    firmwareVersion: "1.4.2",
    lastSeen: nowIso(),
    batteryLevel: 88
  },
  {
    id: "dev-002",
    name: "Worker B - Wearable",
    status: "offline",
    firmwareVersion: "1.3.9",
    lastSeen: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    batteryLevel: 42
  },
  {
    id: "dev-003",
    name: "Worker C - Wearable",
    status: "critical",
    firmwareVersion: "2.0.0",
    lastSeen: nowIso(),
    batteryLevel: 14
  }
];

const initialTelemetry: Telemetry[] = [
  {
    id: "tel-001",
    deviceId: "dev-001",
    heartRate: 84,
    bodyTemperature: 36.7,
    activityLevel: 51,
    battery: 88,
    signalStrength: 84,
    latitude: 35.6892,
    longitude: 51.389,
    timestamp: nowIso()
  },
  {
    id: "tel-002",
    deviceId: "dev-003",
    heartRate: 138,
    bodyTemperature: 38.2,
    activityLevel: 75,
    battery: 14,
    signalStrength: 28,
    latitude: 35.698,
    longitude: 51.408,
    timestamp: nowIso()
  }
];

const initialAlerts: Alert[] = [
  {
    id: "alt-001",
    deviceId: "dev-003",
    type: "battery",
    severity: "critical",
    message: "Battery dropped below configured threshold",
    timestamp: nowIso(),
    acknowledged: false
  }
];

const initialOrganization: Organization = {
  id: "org-001",
  name: "HealthOps Enterprise",
  devices: initialDevices.map((device) => device.id)
};

const initialUsers: User[] = [
  { id: "user-admin", role: "admin" },
  { id: "user-operator", role: "operator" },
  { id: "user-viewer", role: "viewer" }
];

export interface MockDatabase {
  devices: Device[];
  telemetry: Telemetry[];
  alerts: Alert[];
  organization: Organization;
  users: User[];
  thresholds: ThresholdConfig;
  geofence: GeofenceConfig;
}

export const mockDb: MockDatabase = {
  devices: initialDevices,
  telemetry: initialTelemetry,
  alerts: initialAlerts,
  organization: initialOrganization,
  users: initialUsers,
  thresholds: DEFAULT_THRESHOLDS,
  geofence: DEFAULT_GEOFENCE
};
