export interface ThresholdConfig {
  warningHeartRate: number;
  criticalHeartRate: number;
  criticalBodyTemperature: number;
  lowBatteryThreshold: number;
  weakSignalThreshold: number;
  noTelemetrySeconds: number;
}

export interface GeofenceConfig {
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
}
