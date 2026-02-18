export type AlertSeverity = "low" | "medium" | "critical";
export type AlertType =
  | "heartRate"
  | "bodyTemperature"
  | "battery"
  | "heartbeat"
  | "geofence"
  | "signal";

export interface Alert {
  id: string;
  deviceId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}
