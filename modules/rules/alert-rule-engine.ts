import { distanceMeters } from "@/lib/geo";
import { nowIso } from "@/lib/time";
import type { Alert, GeofenceConfig, Telemetry, ThresholdConfig } from "@/types";

interface RuleContext {
  thresholds: ThresholdConfig;
  geofence: GeofenceConfig;
  lastTelemetryByDevice: Record<string, number>;
}

const createAlert = (
  deviceId: string,
  type: Alert["type"],
  severity: Alert["severity"],
  message: string
): Alert => ({
  id: `alt-${crypto.randomUUID().slice(0, 8)}`,
  deviceId,
  type,
  severity,
  message,
  timestamp: nowIso(),
  acknowledged: false
});

export const evaluateTelemetryRules = (
  telemetry: Telemetry,
  context: RuleContext
): Alert[] => {
  const { thresholds, geofence } = context;
  const alerts: Alert[] = [];

  if (telemetry.heartRate > thresholds.criticalHeartRate) {
    alerts.push(
      createAlert(
        telemetry.deviceId,
        "heartRate",
        "critical",
        `Critical heart rate detected (${telemetry.heartRate} bpm)`
      )
    );
  } else if (telemetry.heartRate > thresholds.warningHeartRate) {
    alerts.push(
      createAlert(
        telemetry.deviceId,
        "heartRate",
        "medium",
        `Elevated heart rate detected (${telemetry.heartRate} bpm)`
      )
    );
  }

  if (telemetry.bodyTemperature > thresholds.criticalBodyTemperature) {
    alerts.push(
      createAlert(
        telemetry.deviceId,
        "bodyTemperature",
        "critical",
        `Critical body temperature detected (${telemetry.bodyTemperature} C)`
      )
    );
  }

  if (telemetry.battery < thresholds.lowBatteryThreshold) {
    alerts.push(
      createAlert(
        telemetry.deviceId,
        "battery",
        "medium",
        `Battery dropped below threshold (${telemetry.battery}%)`
      )
    );
  }

  if (telemetry.signalStrength < thresholds.weakSignalThreshold) {
    alerts.push(
      createAlert(
        telemetry.deviceId,
        "signal",
        "low",
        `Weak signal detected (${telemetry.signalStrength}%)`
      )
    );
  }

  const distanceFromFenceCenter = distanceMeters(
    { latitude: telemetry.latitude, longitude: telemetry.longitude },
    { latitude: geofence.centerLatitude, longitude: geofence.centerLongitude }
  );

  if (distanceFromFenceCenter > geofence.radiusMeters) {
    alerts.push(
      createAlert(
        telemetry.deviceId,
        "geofence",
        "critical",
        `Geofence breach detected (${Math.round(distanceFromFenceCenter)}m outside boundary)`
      )
    );
  }

  return alerts;
};

export const evaluateNoTelemetryRules = (context: RuleContext): Alert[] => {
  const nowMs = Date.now();
  const alerts: Alert[] = [];

  for (const [deviceId, lastReceivedAt] of Object.entries(context.lastTelemetryByDevice)) {
    if (nowMs - lastReceivedAt > context.thresholds.noTelemetrySeconds * 1000) {
      alerts.push(
        createAlert(
          deviceId,
          "heartbeat",
          "critical",
          `No telemetry received for more than ${context.thresholds.noTelemetrySeconds} seconds`
        )
      );
    }
  }

  return alerts;
};
