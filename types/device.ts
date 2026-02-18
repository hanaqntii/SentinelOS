export type DeviceStatus = "online" | "offline" | "critical";

export interface Device {
  id: string;
  name: string;
  status: DeviceStatus;
  firmwareVersion: string;
  lastSeen: string;
  batteryLevel: number;
}

export interface DeviceSignal {
  deviceId: string;
  strength: number;
  timestamp: string;
}
