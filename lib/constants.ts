import type { GeofenceConfig, ThresholdConfig } from "@/types";

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  warningHeartRate: 130,
  criticalHeartRate: 150,
  criticalBodyTemperature: 39,
  lowBatteryThreshold: 20,
  weakSignalThreshold: 30,
  noTelemetrySeconds: 60
};

export const DEFAULT_GEOFENCE: GeofenceConfig = {
  centerLatitude: 35.6892,
  centerLongitude: 51.389,
  radiusMeters: 800
};

export const TELEMETRY_STREAM_MIN_MS = 3000;
export const TELEMETRY_STREAM_MAX_MS = 5000;
export const WEBSOCKET_RECONNECT_MS = 2000;
export const REALTIME_THROTTLE_MS = 1000;
