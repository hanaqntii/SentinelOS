"use client";

import { useEffect, useMemo } from "react";
import { distanceMeters } from "@/lib/geo";
import { websocketService } from "@/services/realtime";
import { useAlertStore, useDeviceStore, useSettingsStore, useTelemetryStore } from "@/store";
import type { Telemetry } from "@/types";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const TRAIL_POINTS = 8;

const toGridPoint = (
  telemetry: Pick<Telemetry, "latitude" | "longitude">,
  center: { latitude: number; longitude: number }
) => {
  const x = clamp(50 + ((telemetry.longitude - center.longitude) / 0.01) * 45, 3, 97);
  const y = clamp(50 - ((telemetry.latitude - center.latitude) / 0.01) * 45, 3, 97);
  return { x, y };
};

export function ControlRoomMap() {
  const devices = useDeviceStore((state) => state.devices);
  const fetchDevices = useDeviceStore((state) => state.fetchDevices);
  const byDevice = useTelemetryStore((state) => state.byDevice);
  const fetchTelemetry = useTelemetryStore((state) => state.fetchTelemetry);
  const geofence = useSettingsStore((state) => state.geofence);
  const fetchThresholds = useSettingsStore((state) => state.fetchThresholds);
  const alerts = useAlertStore((state) => state.alerts);
  const fetchAlerts = useAlertStore((state) => state.fetchAlerts);

  useEffect(() => {
    void (async () => {
      await Promise.all([fetchDevices(), fetchAlerts(), fetchThresholds()]);
      const currentDevices = useDeviceStore.getState().devices;
      await Promise.all(currentDevices.map((device) => fetchTelemetry(device.id, 20)));
      websocketService.connect();
    })();

    return () => websocketService.disconnect();
  }, [fetchAlerts, fetchDevices, fetchTelemetry, fetchThresholds]);

  const workerPoints = useMemo(() => {
    return devices
      .map((device) => {
        const latest = byDevice[device.id]?.[0];
        if (!latest) {
          return null;
        }

        const center = {
          latitude: geofence.centerLatitude,
          longitude: geofence.centerLongitude
        };
        const { x, y } = toGridPoint(latest, center);
        const trail = (byDevice[device.id] ?? [])
          .slice(0, TRAIL_POINTS)
          .reverse()
          .map((entry) => toGridPoint(entry, center));

        const dist = distanceMeters(
          { latitude: latest.latitude, longitude: latest.longitude },
          { latitude: geofence.centerLatitude, longitude: geofence.centerLongitude }
        );

        return {
          id: device.id,
          name: device.name,
          status: device.status,
          x,
          y,
          distanceMeters: dist,
          breached: dist > geofence.radiusMeters,
          trail
        };
      })
      .filter((point): point is NonNullable<typeof point> => Boolean(point));
  }, [byDevice, devices, geofence.centerLatitude, geofence.centerLongitude, geofence.radiusMeters]);

  const breachCount = workerPoints.filter((point) => point.breached).length;
  const geofenceAlerts = alerts.filter((alert) => alert.type === "geofence" && !alert.acknowledged);

  return (
    <main className="space-y-6 p-3 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Control Room Map</h1>
        <p className="mt-1 text-sm text-slate-400">
          Live worker position overlay with geofence breach awareness.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Workers In View</p>
          <p className="mt-2 text-2xl font-semibold">{workerPoints.length}</p>
        </div>
        <div className="rounded-xl border border-rose-700/60 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Geofence Breaches</p>
          <p className="mt-2 text-2xl font-semibold text-rose-300">{breachCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Open Geofence Alerts</p>
          <p className="mt-2 text-2xl font-semibold">{geofenceAlerts.length}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
        <p className="mb-3 text-sm font-semibold text-slate-100">Live Worker Location Grid</p>
        <div className="h-[380px] w-full rounded-lg border border-slate-800 bg-slate-950">
          <svg viewBox="0 0 100 100" className="h-full w-full">
            <rect x="0" y="0" width="100" height="100" fill="transparent" />
            <circle
              cx="50"
              cy="50"
              r="28"
              fill="rgba(37, 99, 235, 0.12)"
              stroke="#2563EB"
              strokeWidth="0.8"
            />
            {workerPoints.map((point) => (
              <g key={point.id}>
                <polyline
                  points={point.trail.map((entry) => `${entry.x},${entry.y}`).join(" ")}
                  fill="none"
                  stroke={point.breached ? "#DC2626" : "#1D4ED8"}
                  strokeOpacity="0.5"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="1.4"
                  fill={point.breached ? "#DC2626" : point.status === "offline" ? "#F59E0B" : "#1D4ED8"}
                  opacity="0.75"
                />
                <g
                  transform={`translate(${point.x} ${point.y})`}
                  style={{ transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)" }}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r="2.1"
                    fill={point.breached ? "#DC2626" : point.status === "offline" ? "#F59E0B" : "#16A34A"}
                  />
                </g>
              </g>
            ))}
          </svg>
        </div>
      </section>
    </main>
  );
}
