"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { canPerformAction } from "@/lib/rbac";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { deviceApi } from "@/services/api";
import { websocketService } from "@/services/realtime";
import { useAuthStore, useDeviceStore, useTelemetryStore } from "@/store";
import type { Device, Telemetry } from "@/types";

interface DeviceDetailPanelProps {
  deviceId: string;
}

interface VitalsPoint {
  time: string;
  heartRate: number;
  bodyTemperature: number;
  battery: number;
  signalStrength: number;
}

type TrendDirection = "up" | "down" | "stable";

const MAX_DETAIL_POINTS = 40;

const toChartPoint = (row: Telemetry): VitalsPoint => ({
  time: new Date(row.timestamp).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
  heartRate: row.heartRate,
  bodyTemperature: row.bodyTemperature,
  battery: row.battery,
  signalStrength: row.signalStrength
});

const MINUTE_MS = 60 * 1000;
const AVERAGE_STREAM_INTERVAL_SECONDS = 4;

const averageHeartRateLastFiveMinutes = (rows: Telemetry[]): number | null => {
  const since = Date.now() - 5 * MINUTE_MS;
  const values = rows
    .filter((row) => new Date(row.timestamp).getTime() >= since)
    .map((row) => row.heartRate);

  if (values.length === 0) {
    return null;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
};

const maxHeartRateToday = (rows: Telemetry[]): number | null => {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const values = rows
    .filter((row) => new Date(row.timestamp).getTime() >= dayStart.getTime())
    .map((row) => row.heartRate);

  if (values.length === 0) {
    return null;
  }

  return Math.max(...values);
};

const batteryConsumptionRatePerMinute = (rows: Telemetry[]): number | null => {
  if (rows.length < 2) {
    return null;
  }

  const newest = rows[0];
  const oldest = rows[Math.min(rows.length - 1, 30)];
  const minutes =
    (new Date(newest.timestamp).getTime() - new Date(oldest.timestamp).getTime()) / MINUTE_MS;

  if (minutes <= 0) {
    return null;
  }

  const delta = oldest.battery - newest.battery;
  return Number((delta / minutes).toFixed(2));
};

const uptimePercent = (rows: Telemetry[]): number | null => {
  if (rows.length < 2) {
    return null;
  }

  const newestMs = new Date(rows[0].timestamp).getTime();
  const oldestMs = new Date(rows[rows.length - 1].timestamp).getTime();
  const observedSeconds = Math.max((newestMs - oldestMs) / 1000, 1);
  const expectedSamples = observedSeconds / AVERAGE_STREAM_INTERVAL_SECONDS;
  const ratio = (rows.length / expectedSamples) * 100;
  return Math.max(0, Math.min(100, Number(ratio.toFixed(1))));
};

const trendDirection = (
  current: number | null,
  previous: number | null,
  epsilon = 0.01
): TrendDirection => {
  if (current === null || previous === null) {
    return "stable";
  }

  if (current > previous + epsilon) {
    return "up";
  }
  if (current < previous - epsilon) {
    return "down";
  }
  return "stable";
};

const trendMeta: Record<TrendDirection, { symbol: string; className: string }> = {
  up: { symbol: "▲", className: "text-rose-300" },
  down: { symbol: "▼", className: "text-emerald-300" },
  stable: { symbol: "■", className: "text-slate-400" }
};

export function DeviceDetailPanel({ deviceId }: DeviceDetailPanelProps) {
  const { t } = useI18n();
  const role = useAuthStore((state) => state.user?.role ?? "viewer");
  const liveDevice = useDeviceStore((state) =>
    state.devices.find((entry) => entry.id === deviceId) ?? null
  );
  const byDevice = useTelemetryStore((state) => state.byDevice);
  const fetchTelemetry = useTelemetryStore((state) => state.fetchTelemetry);

  const [device, setDevice] = useState<Device | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<VitalsPoint[]>([]);

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | null = null;

    const run = async () => {
      try {
        const [deviceResponse] = await Promise.all([
          deviceApi.getById(deviceId),
          fetchTelemetry(deviceId, 50)
        ]);

        if (!mounted) {
          return;
        }

        setDevice(deviceResponse.data);
        const seed = (useTelemetryStore.getState().byDevice[deviceId] ?? [])
          .slice()
          .reverse()
          .map(toChartPoint);
        setChartData(seed);

        websocketService.connect();
        unsub = websocketService.subscribe((next) => {
          if (next.deviceId !== deviceId || !mounted) {
            return;
          }

          setChartData((prev) => [...prev, toChartPoint(next)].slice(-MAX_DETAIL_POINTS));
        });
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      mounted = false;
      if (unsub) {
        unsub();
      }
    };
  }, [deviceId, fetchTelemetry]);

  const current = byDevice[deviceId]?.[0];
  const deviceTelemetry = byDevice[deviceId] ?? [];
  const canOperate = canPerformAction(role, "devices.control");
  const statusText = useMemo(() => {
    if (!liveDevice) {
      return "unknown";
    }
    return liveDevice.status;
  }, [liveDevice]);

  const avgHr5m = useMemo(() => averageHeartRateLastFiveMinutes(deviceTelemetry), [deviceTelemetry]);
  const maxHrToday = useMemo(() => maxHeartRateToday(deviceTelemetry), [deviceTelemetry]);
  const batteryRate = useMemo(
    () => batteryConsumptionRatePerMinute(deviceTelemetry),
    [deviceTelemetry]
  );
  const uptime = useMemo(() => uptimePercent(deviceTelemetry), [deviceTelemetry]);
  const previousSlice = useMemo(() => deviceTelemetry.slice(6), [deviceTelemetry]);
  const prevAvgHr5m = useMemo(() => averageHeartRateLastFiveMinutes(previousSlice), [previousSlice]);
  const prevMaxHrToday = useMemo(() => maxHeartRateToday(previousSlice), [previousSlice]);
  const prevBatteryRate = useMemo(
    () => batteryConsumptionRatePerMinute(previousSlice),
    [previousSlice]
  );
  const prevUptime = useMemo(() => uptimePercent(previousSlice), [previousSlice]);

  const uptimeTrend = trendDirection(uptime, prevUptime);
  const avgHrTrend = trendDirection(avgHr5m, prevAvgHr5m);
  const maxHrTrend = trendDirection(maxHrToday, prevMaxHrToday);
  const batteryTrend = trendDirection(batteryRate, prevBatteryRate);

  if (isLoading) {
    return (
      <main className="p-6">
        <p className="text-sm text-slate-400">{t("deviceDetail.loading")}</p>
      </main>
    );
  }

  if (!device) {
    return (
      <main className="p-6">
        <p className="text-sm text-rose-300">{t("deviceDetail.notFound")}</p>
        <Link href="/devices" className="mt-3 inline-block text-sm text-brand-600 hover:text-brand-700">
          {t("deviceDetail.backToDevices")}
        </Link>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{device.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {device.id} - {t("deviceDetail.firmware")} {device.firmwareVersion}
          </p>
        </div>
        <Link
          href="/devices"
          className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
        >
          {t("deviceDetail.backToDevices")}
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("deviceDetail.status")}</p>
          <p className="mt-2 text-xl font-semibold capitalize">{t(`status.${statusText}`)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("deviceDetail.heartRate")}</p>
          <p className="mt-2 text-xl font-semibold">{current?.heartRate ?? "-"} bpm</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("deviceDetail.temperature")}</p>
          <p className="mt-2 text-xl font-semibold">{current?.bodyTemperature ?? "-"} C</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("deviceDetail.signalStrength")}</p>
          <p className="mt-2 text-xl font-semibold">{current?.signalStrength ?? "-"}%</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("dashboard.lastSeen")}</p>
          <p className="mt-2 text-sm font-semibold">
            {liveDevice ? new Date(liveDevice.lastSeen).toLocaleTimeString() : "-"}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("deviceDetail.uptimePercent")}</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xl font-semibold">
              {uptime ?? "-"}
              {uptime !== null ? "%" : ""}
            </p>
            <span className={`text-xs ${trendMeta[uptimeTrend].className}`}>
              {trendMeta[uptimeTrend].symbol}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("deviceDetail.avgHr5m")}</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xl font-semibold">
              {avgHr5m ?? "-"}
              {avgHr5m !== null ? " bpm" : ""}
            </p>
            <span className={`text-xs ${trendMeta[avgHrTrend].className}`}>
              {trendMeta[avgHrTrend].symbol}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("deviceDetail.maxHrToday")}</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xl font-semibold">
              {maxHrToday ?? "-"}
              {maxHrToday !== null ? " bpm" : ""}
            </p>
            <span className={`text-xs ${trendMeta[maxHrTrend].className}`}>
              {trendMeta[maxHrTrend].symbol}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("deviceDetail.batteryRate")}</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xl font-semibold">
              {batteryRate ?? "-"}
              {batteryRate !== null ? "%/min" : ""}
            </p>
            <span className={`text-xs ${trendMeta[batteryTrend].className}`}>
              {trendMeta[batteryTrend].symbol}
            </span>
          </div>
        </div>
      </section>

      <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-100">{t("deviceDetail.liveVitals")}</p>
          <p className="text-xs text-slate-400">{t("deviceDetail.rollingHistory")}</p>
        </div>
        <div className="h-64 w-full sm:h-80">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "0.5rem"
                }}
              />
              <Line type="monotone" dataKey="heartRate" stroke="#16A34A" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="bodyTemperature" stroke="#1D4ED8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="battery" stroke="#f59e0b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="signalStrength" stroke="#DC2626" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-slate-100">{t("deviceDetail.roleControls")}</p>
        <p className="mt-1 text-sm text-slate-400">
          {canOperate ? t("deviceDetail.canOperate") : t("deviceDetail.cannotOperate")}
        </p>
        <button
          type="button"
          disabled={!canOperate}
          className="mt-3 rounded bg-brand-600 px-3 py-2 text-xs font-medium hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {canOperate ? t("deviceDetail.sendPing") : t("deviceDetail.viewerNoControl")}
        </button>
      </section>
    </main>
  );
}
