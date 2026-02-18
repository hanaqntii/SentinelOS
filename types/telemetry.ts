export interface Telemetry {
  id: string;
  deviceId: string;
  heartRate: number;
  bodyTemperature: number;
  activityLevel: number;
  battery: number;
  signalStrength: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface TelemetryQuery {
  deviceId?: string;
  from?: string;
  to?: string;
  limit?: number;
}
