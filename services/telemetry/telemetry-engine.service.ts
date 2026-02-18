import { clamp, randomInt } from "@/lib/math";
import { nowIso } from "@/lib/time";
import { mockDb } from "@/services/api/mock-db";
import { useDeviceStore, useTelemetryStore } from "@/store";
import type { Device, Telemetry } from "@/types";

const OFFLINE_EMIT_PROBABILITY = 0.1;
const OUTAGE_TRIGGER_PROBABILITY = 0.04;
const outageUntilByDevice: Record<string, number> = {};

const buildTelemetryForDevice = (device: Device): Telemetry => {
  const latest = useTelemetryStore
    .getState()
    .byDevice[device.id]?.[0] ?? mockDb.telemetry.find((entry) => entry.deviceId === device.id);

  const nextBattery = clamp((latest?.battery ?? device.batteryLevel) - randomInt(0, 2), 0, 100);
  const signalStrength = clamp((latest?.signalStrength ?? 78) + randomInt(-6, 5), 8, 100);

  return {
    id: `tel-live-${crypto.randomUUID().slice(0, 8)}`,
    deviceId: device.id,
    heartRate: clamp((latest?.heartRate ?? 85) + randomInt(-6, 7), 45, 190),
    bodyTemperature: clamp(
      Number(((latest?.bodyTemperature ?? 36.8) + randomInt(-3, 3) * 0.1).toFixed(1)),
      34.5,
      41.5
    ),
    activityLevel: clamp((latest?.activityLevel ?? 45) + randomInt(-10, 12), 0, 100),
    battery: nextBattery,
    signalStrength,
    latitude: Number(((latest?.latitude ?? 35.6892) + randomInt(-2, 2) * 0.0006).toFixed(6)),
    longitude: Number(((latest?.longitude ?? 51.389) + randomInt(-2, 2) * 0.0006).toFixed(6)),
    timestamp: nowIso()
  };
};

export const telemetryEngineService = {
  generateBatch() {
    const devices = useDeviceStore.getState().devices.length
      ? useDeviceStore.getState().devices
      : mockDb.devices;

    const generated: Telemetry[] = [];
    const offlineDevices = new Set<string>();
    const nowMs = Date.now();

    for (const device of devices) {
      const activeOutageUntil = outageUntilByDevice[device.id];
      if (activeOutageUntil && activeOutageUntil > nowMs) {
        offlineDevices.add(device.id);
        continue;
      }

      if (activeOutageUntil && activeOutageUntil <= nowMs) {
        delete outageUntilByDevice[device.id];
      }

      if (Math.random() < OUTAGE_TRIGGER_PROBABILITY) {
        outageUntilByDevice[device.id] = nowMs + randomInt(65000, 90000);
        offlineDevices.add(device.id);
        continue;
      }

      // Simulate intermittent offline devices by skipping emission.
      if (Math.random() < OFFLINE_EMIT_PROBABILITY) {
        offlineDevices.add(device.id);
        continue;
      }

      generated.push(buildTelemetryForDevice(device));
    }

    return { telemetry: generated, offlineDevices, devices };
  }
};
