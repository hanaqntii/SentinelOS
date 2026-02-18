import { randomInt } from "@/lib/math";
import {
  TELEMETRY_STREAM_MAX_MS,
  TELEMETRY_STREAM_MIN_MS,
  WEBSOCKET_RECONNECT_MS
} from "@/lib/constants";
import { evaluateNoTelemetryRules, evaluateTelemetryRules } from "@/modules/rules";
import { telemetryEngineService } from "@/services/telemetry";
import { useAlertStore, useDeviceStore, useSettingsStore, useTelemetryStore } from "@/store";
import type { Telemetry } from "@/types";

export type StreamConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "closed";

type Subscriber = (telemetry: Telemetry) => void;

class MockWebSocketService {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscribers = new Set<Subscriber>();
  private state: StreamConnectionState = "idle";
  private lastHeartbeatByDevice: Record<string, number> = {};

  get connectionState() {
    return this.state;
  }

  subscribe(handler: Subscriber) {
    this.subscribers.add(handler);

    return () => {
      this.subscribers.delete(handler);
    };
  }

  connect() {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    this.state = "connecting";
    this.startLoop();
  }

  disconnect() {
    this.state = "closed";

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  simulateDisconnectAndReconnect() {
    this.disconnect();
    this.state = "reconnecting";
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, WEBSOCKET_RECONNECT_MS);
  }

  private startLoop() {
    this.state = "connected";

    const interval = randomInt(TELEMETRY_STREAM_MIN_MS, TELEMETRY_STREAM_MAX_MS);
    this.timer = setTimeout(() => {
      try {
        this.emitTelemetry();

        if (Math.random() < 0.02) {
          this.simulateDisconnectAndReconnect();
          return;
        }

        this.startLoop();
      } catch {
        this.state = "reconnecting";
        this.reconnectTimer = setTimeout(() => this.startLoop(), WEBSOCKET_RECONNECT_MS);
      }
    }, interval);
  }

  private emitTelemetry() {
    const telemetryStore = useTelemetryStore.getState();
    const deviceStore = useDeviceStore.getState();
    const alertStore = useAlertStore.getState();
    const settingsStore = useSettingsStore.getState();
    const { telemetry, devices } = telemetryEngineService.generateBatch();

    // Seed heartbeat tracking from known device lastSeen values.
    for (const device of devices) {
      if (!this.lastHeartbeatByDevice[device.id]) {
        this.lastHeartbeatByDevice[device.id] = new Date(device.lastSeen).getTime();
      }
    }

    for (const nextTelemetry of telemetry) {
      telemetryStore.ingestTelemetry(nextTelemetry);
      this.lastHeartbeatByDevice[nextTelemetry.deviceId] = Date.now();

      const alerts = evaluateTelemetryRules(nextTelemetry, {
        thresholds: settingsStore.thresholds,
        geofence: settingsStore.geofence,
        lastTelemetryByDevice: this.lastHeartbeatByDevice
      });

      const hasCriticalAlert = alerts.some((alert) => alert.severity === "critical");
      deviceStore.updateDeviceRuntime({
        deviceId: nextTelemetry.deviceId,
        status: hasCriticalAlert ? "critical" : "online",
        lastSeen: nextTelemetry.timestamp,
        batteryLevel: nextTelemetry.battery
      });

      alerts.forEach((alert) => {
        alertStore.pushAlert(alert);
      });

      this.subscribers.forEach((handler) => {
        handler(nextTelemetry);
      });
    }

    const heartbeatAlerts = evaluateNoTelemetryRules({
      thresholds: settingsStore.thresholds,
      geofence: settingsStore.geofence,
      lastTelemetryByDevice: this.lastHeartbeatByDevice
    });

    heartbeatAlerts.forEach((alert) => {
      alertStore.pushAlert(alert);
      deviceStore.updateDeviceRuntime({
        deviceId: alert.deviceId,
        status: "offline"
      });
    });
  }
}

export const websocketService = new MockWebSocketService();
