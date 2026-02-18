"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useI18n } from "@/lib/i18n/use-i18n";
import { analyticsApi } from "@/services/api";
import { useAlertStore, useDeviceStore, useTelemetryStore } from "@/store";
import type { Telemetry } from "@/types";

const MINUTE_MS = 60 * 1000;
const AVERAGE_STREAM_INTERVAL_SECONDS = 4;
const RANGE_OPTIONS = [
  { id: "1h", hours: 1 },
  { id: "24h", hours: 24 },
  { id: "7d", hours: 24 * 7 }
] as const;
type TimeRangeId = (typeof RANGE_OPTIONS)[number]["id"];

const calcUptimePercent = (rows: Telemetry[]): number => {
  if (rows.length < 2) {
    return 0;
  }
  const newestMs = new Date(rows[0].timestamp).getTime();
  const oldestMs = new Date(rows[rows.length - 1].timestamp).getTime();
  const observedSeconds = Math.max((newestMs - oldestMs) / 1000, 1);
  const expectedSamples = observedSeconds / AVERAGE_STREAM_INTERVAL_SECONDS;
  return Math.max(0, Math.min(100, Number(((rows.length / expectedSamples) * 100).toFixed(1))));
};

export function AnalyticsOverview() {
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRangeId>("24h");
  const [primaryWorkerId, setPrimaryWorkerId] = useState<string>("all");
  const [secondaryWorkerId, setSecondaryWorkerId] = useState<string>("none");

  const devices = useDeviceStore((state) => state.devices);
  const fetchDevices = useDeviceStore((state) => state.fetchDevices);
  const alerts = useAlertStore((state) => state.alerts);
  const fetchAlerts = useAlertStore((state) => state.fetchAlerts);
  const byDevice = useTelemetryStore((state) => state.byDevice);
  const fetchTelemetry = useTelemetryStore((state) => state.fetchTelemetry);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await Promise.all([fetchDevices(), fetchAlerts()]);
        const currentDevices = useDeviceStore.getState().devices;
        await Promise.all(currentDevices.map((device) => fetchTelemetry(device.id, 120)));
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [fetchAlerts, fetchDevices, fetchTelemetry]);

  const rangeStartMs = useMemo(() => {
    const range = RANGE_OPTIONS.find((entry) => entry.id === timeRange) ?? RANGE_OPTIONS[1];
    return Date.now() - range.hours * 60 * MINUTE_MS;
  }, [timeRange]);

  const visibleDeviceIds = useMemo(() => {
    if (primaryWorkerId === "all") {
      return devices.map((device) => device.id);
    }
    const ids = [primaryWorkerId];
    if (secondaryWorkerId !== "none") {
      ids.push(secondaryWorkerId);
    }
    return ids;
  }, [devices, primaryWorkerId, secondaryWorkerId]);

  const aggregatedTelemetryInRange = useMemo(
    () =>
      devices
        .flatMap((device) => byDevice[device.id] ?? [])
        .filter((entry) => new Date(entry.timestamp).getTime() >= rangeStartMs),
    [byDevice, devices, rangeStartMs]
  );

  const dailyAvgHr = useMemo(() => {
    if (aggregatedTelemetryInRange.length === 0) {
      return 0;
    }
    return Number(
      (
        aggregatedTelemetryInRange.reduce((sum, entry) => sum + entry.heartRate, 0) /
        aggregatedTelemetryInRange.length
      ).toFixed(1)
    );
  }, [aggregatedTelemetryInRange]);

  const dailyAvgTemp = useMemo(() => {
    if (aggregatedTelemetryInRange.length === 0) {
      return 0;
    }
    return Number(
      (
        aggregatedTelemetryInRange.reduce((sum, entry) => sum + entry.bodyTemperature, 0) /
        aggregatedTelemetryInRange.length
      ).toFixed(1)
    );
  }, [aggregatedTelemetryInRange]);

  const dailyAvgBattery = useMemo(() => {
    if (aggregatedTelemetryInRange.length === 0) {
      return 0;
    }
    return Number(
      (
        aggregatedTelemetryInRange.reduce((sum, entry) => sum + entry.battery, 0) /
        aggregatedTelemetryInRange.length
      ).toFixed(1)
    );
  }, [aggregatedTelemetryInRange]);

  const filteredAlerts = useMemo(
    () =>
      alerts.filter(
        (entry) =>
          new Date(entry.timestamp).getTime() >= rangeStartMs &&
          (visibleDeviceIds.length === 0 || visibleDeviceIds.includes(entry.deviceId))
      ),
    [alerts, rangeStartMs, visibleDeviceIds]
  );

  const incidentFrequency = useMemo(() => {
    const counts = {
      critical: filteredAlerts.filter((entry) => entry.severity === "critical").length,
      medium: filteredAlerts.filter((entry) => entry.severity === "medium").length,
      low: filteredAlerts.filter((entry) => entry.severity === "low").length
    };
    return [
      { severity: t("severity.critical"), count: counts.critical },
      { severity: t("severity.medium"), count: counts.medium },
      { severity: t("severity.low"), count: counts.low }
    ];
  }, [filteredAlerts, t]);

  const batteryTrend = useMemo(() => {
    const scopeDevices =
      visibleDeviceIds.length > 0 ? devices.filter((device) => visibleDeviceIds.includes(device.id)) : devices;
    const timeline = Array.from({ length: 30 }, (_, index) => {
      const perDevice = scopeDevices
        .map((device) => byDevice[device.id]?.[index]?.battery)
        .filter((value): value is number => typeof value === "number");
      const avg =
        perDevice.length === 0
          ? null
          : Number((perDevice.reduce((sum, value) => sum + value, 0) / perDevice.length).toFixed(1));
      return {
        point: `${30 - index}`,
        avgBattery: avg
      };
    }).reverse();
    return timeline.filter((entry) => entry.avgBattery !== null);
  }, [byDevice, devices, visibleDeviceIds]);

  const batteryAnomalies = useMemo(
    () => batteryTrend.filter((entry) => typeof entry.avgBattery === "number" && entry.avgBattery < 20),
    [batteryTrend]
  );

  const comparisonData = useMemo(() => {
    const primaryRows =
      primaryWorkerId === "all" ? [] : (byDevice[primaryWorkerId] ?? []).filter((entry) => new Date(entry.timestamp).getTime() >= rangeStartMs);
    const secondaryRows =
      secondaryWorkerId === "none"
        ? []
        : (byDevice[secondaryWorkerId] ?? []).filter((entry) => new Date(entry.timestamp).getTime() >= rangeStartMs);
    const length = Math.max(primaryRows.length, secondaryRows.length, 20);

    return Array.from({ length }, (_, index) => ({
      point: `${length - index}`,
      primaryHr: primaryRows[index]?.heartRate ?? null,
      secondaryHr: secondaryRows[index]?.heartRate ?? null
    })).reverse();
  }, [byDevice, primaryWorkerId, rangeStartMs, secondaryWorkerId]);

  const uptimeStats = useMemo(() => {
    const scopeDevices =
      visibleDeviceIds.length > 0 ? devices.filter((device) => visibleDeviceIds.includes(device.id)) : devices;
    return scopeDevices.map((device) => ({
      worker: device.name.length > 16 ? `${device.name.slice(0, 16)}...` : device.name,
      uptime: calcUptimePercent(
        (byDevice[device.id] ?? []).filter((entry) => new Date(entry.timestamp).getTime() >= rangeStartMs)
      )
    }));
  }, [byDevice, devices, rangeStartMs, visibleDeviceIds]);

  const last24hAlerts = useMemo(() => {
    return filteredAlerts.length;
  }, [filteredAlerts]);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const response = await analyticsApi.exportCsv();
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "sentinelos-telemetry-export.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="p-6">
        <p className="text-sm text-slate-400">{t("analytics.loading")}</p>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{t("analytics.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("analytics.description")}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleExportCsv()}
          disabled={isExporting}
          className="rounded bg-brand-600 px-3 py-2 text-xs font-medium hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? t("analytics.exporting") : t("analytics.exportCsv")}
        </button>
      </div>

      <section className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">{t("analytics.timeRange")}</p>
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => {
              const active = option.id === timeRange;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTimeRange(option.id)}
                  className={`rounded border px-3 py-1.5 text-xs ${
                    active
                      ? "border-brand-600 bg-brand-600/10 text-slate-100"
                      : "border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {t(`analytics.range.${option.id}`)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">{t("analytics.primaryWorker")}</p>
          <select
            value={primaryWorkerId}
            onChange={(event) => setPrimaryWorkerId(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
          >
            <option value="all">{t("analytics.allWorkers")}</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">{t("analytics.secondaryWorker")}</p>
          <select
            value={secondaryWorkerId}
            onChange={(event) => setSecondaryWorkerId(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
            disabled={primaryWorkerId === "all"}
          >
            <option value="none">{t("analytics.none")}</option>
            {devices
              .filter((device) => device.id !== primaryWorkerId)
              .map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
          </select>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("analytics.dailyAvgHr")}</p>
          <p className="mt-2 text-2xl font-semibold">{dailyAvgHr} bpm</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("analytics.dailyAvgTemp")}</p>
          <p className="mt-2 text-2xl font-semibold">{dailyAvgTemp} C</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("analytics.dailyAvgBattery")}</p>
          <p className="mt-2 text-2xl font-semibold">{dailyAvgBattery}%</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("analytics.last24hIncidents")}</p>
          <p className="mt-2 text-2xl font-semibold">{last24hAlerts}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-4 xl:col-span-2">
          <p className="mb-3 text-sm font-semibold text-slate-100">{t("analytics.incidentFrequency")}</p>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={incidentFrequency}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="severity" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-4 xl:col-span-3">
          <p className="mb-3 text-sm font-semibold text-slate-100">{t("analytics.batteryTrend")}</p>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={batteryTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="point" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => [`${value}%`, t("dashboard.battery")]} />
                <Line type="monotone" dataKey="avgBattery" stroke="#F59E0B" strokeWidth={2.4} dot={false} />
                {batteryAnomalies.map((entry) => (
                  <ReferenceDot
                    key={`anomaly-${entry.point}`}
                    x={entry.point}
                    y={entry.avgBattery as number}
                    r={3}
                    fill="#DC2626"
                    stroke="#DC2626"
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {primaryWorkerId !== "all" ? (
        <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-100">{t("analytics.workerComparison")}</p>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="point" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => [`${value} bpm`, t("deviceDetail.heartRate")]} />
                <Line type="monotone" dataKey="primaryHr" stroke="#2563EB" strokeWidth={2.3} dot={false} />
                {secondaryWorkerId !== "none" ? (
                  <Line type="monotone" dataKey="secondaryHr" stroke="#16A34A" strokeWidth={2.3} dot={false} />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="mb-3 text-sm font-semibold text-slate-100">{t("analytics.uptimeStats")}</p>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={uptimeStats} layout="vertical" margin={{ left: 22, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis dataKey="worker" type="category" tick={{ fill: "#94a3b8", fontSize: 11 }} width={120} />
              <Tooltip formatter={(value: number) => [`${value}%`, t("deviceDetail.uptimePercent")]} />
              <Bar dataKey="uptime" fill="#16A34A" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </main>
  );
}
