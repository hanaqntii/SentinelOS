"use client";

import { useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useI18n } from "@/lib/i18n/use-i18n";
import { canPerformAction } from "@/lib/rbac";
import { websocketService } from "@/services/realtime";
import { useAlertStore, useAuthStore, useDeviceStore, useTelemetryStore } from "@/store";
import type { StreamConnectionState } from "@/services/realtime";
import type { Telemetry } from "@/types";
import { DeviceStatusTable } from "./device-status-table";
import { KpiCard } from "./kpi-card";
import { LiveHeartRateChart } from "./live-heart-rate-chart";

interface ChartPoint {
  time: string;
  avgHeartRate: number;
}

const MAX_CHART_POINTS = 24;

const formatChartTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" });

const calculateAvgHeartRate = (
  devices: Array<{ id: string }>,
  byDevice: Record<string, Telemetry[]>
): number => {
  const values = devices
    .map((device) => byDevice[device.id]?.[0]?.heartRate)
    .filter((value): value is number => typeof value === "number");

  if (values.length === 0) {
    return 0;
  }

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Number(avg.toFixed(1));
};

export function DashboardOverview() {
  const { t } = useI18n();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [connectionState, setConnectionState] = useState<StreamConnectionState>("idle");
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  const devices = useDeviceStore((state) => state.devices);
  const fetchDevices = useDeviceStore((state) => state.fetchDevices);
  const byDevice = useTelemetryStore((state) => state.byDevice);
  const fetchTelemetry = useTelemetryStore((state) => state.fetchTelemetry);
  const alerts = useAlertStore((state) => state.alerts);
  const fetchAlerts = useAlertStore((state) => state.fetchAlerts);
  const acknowledgeAlert = useAlertStore((state) => state.acknowledge);
  const role = useAuthStore((state) => state.user?.role ?? "viewer");

  useEffect(() => {
    let isMounted = true;
    let unsubscribeStream: (() => void) | null = null;
    let connectionTicker: ReturnType<typeof setInterval> | null = null;

    const bootstrap = async () => {
      try {
        await Promise.all([fetchDevices(), fetchAlerts()]);
        const currentDevices = useDeviceStore.getState().devices;

        await Promise.all(currentDevices.map((device) => fetchTelemetry(device.id, 30)));

        const avg = calculateAvgHeartRate(currentDevices, useTelemetryStore.getState().byDevice);
        if (isMounted && avg > 0) {
          setChartData([{ time: formatChartTime(new Date().toISOString()), avgHeartRate: avg }]);
        }

        websocketService.connect();
        setConnectionState(websocketService.connectionState);

        unsubscribeStream = websocketService.subscribe(() => {
          const latestDevices = useDeviceStore.getState().devices;
          const latestByDevice = useTelemetryStore.getState().byDevice;
          const nextAvg = calculateAvgHeartRate(latestDevices, latestByDevice);
          if (nextAvg === 0 || !isMounted) {
            return;
          }

          setChartData((prev) =>
            [...prev, { time: formatChartTime(new Date().toISOString()), avgHeartRate: nextAvg }].slice(
              -MAX_CHART_POINTS
            )
          );
        });

        connectionTicker = setInterval(() => {
          if (isMounted) {
            setConnectionState(websocketService.connectionState);
          }
        }, 1000);
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
      if (unsubscribeStream) {
        unsubscribeStream();
      }
      if (connectionTicker) {
        clearInterval(connectionTicker);
      }
      websocketService.disconnect();
    };
  }, [fetchAlerts, fetchDevices, fetchTelemetry]);

  const totalDevices = devices.length;
  const activeDevices = devices.filter((device) => device.status === "online").length;
  const offlineDevices = devices.filter((device) => device.status === "offline").length;
  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === "critical" && !alert.acknowledged
  ).length;
  const latestCriticalAlert = alerts.find(
    (alert) => alert.severity === "critical" && !alert.acknowledged
  );
  const canAcknowledge = canPerformAction(role, "alerts.acknowledge");
  const canManageSettings = canPerformAction(role, "settings.manage");

  const connectionTone = useMemo(() => {
    if (connectionState === "connected") {
      return "text-emerald-300";
    }

    if (connectionState === "reconnecting" || connectionState === "connecting") {
      return "text-amber-300";
    }

    return "text-slate-300";
  }, [connectionState]);

  if (isBootstrapping) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
        <p className="mt-2 text-sm text-slate-400">{t("dashboard.initializing")}</p>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-3 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{t("dashboard.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <div className="rounded border border-slate-700 px-2 py-1 text-xs">
          {t("dashboard.stream")}: <span className={`capitalize ${connectionTone}`}>{connectionState}</span>
        </div>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-slate-100">
          {t("dashboard.roleMode")}: {t(`roleTitle.${role}`)}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {canManageSettings
            ? t("dashboard.adminMode")
            : !canAcknowledge
              ? t("dashboard.viewerMode")
              : t("dashboard.operatorMode")}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title={t("dashboard.totalDevices")} value={totalDevices} />
        <KpiCard title={t("dashboard.activeDevices")} value={activeDevices} tone="success" />
        <KpiCard title={t("dashboard.offlineDevices")} value={offlineDevices} tone="warning" />
        <KpiCard title={t("dashboard.criticalAlerts")} value={criticalAlerts} tone="danger" />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm font-semibold text-slate-100">{t("dashboard.liveIncidentAction")}</p>
          <p className="mt-1 text-sm text-slate-400">
            {latestCriticalAlert ? latestCriticalAlert.message : t("dashboard.noCritical")}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={!canAcknowledge || !latestCriticalAlert}
              onClick={() => {
                if (latestCriticalAlert) {
                  void acknowledgeAlert(latestCriticalAlert.id);
                }
              }}
              className="rounded bg-brand-600 px-3 py-2 text-xs font-medium hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {!canAcknowledge ? t("dashboard.viewerCannotAcknowledge") : t("dashboard.acknowledgeLatest")}
            </button>
            <Link
              href="/alerts"
              className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
            >
              {t("dashboard.openAlertsModule")}
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm font-semibold text-slate-100">{t("dashboard.roleWorkspace")}</p>
          {canManageSettings ? (
            <div className="mt-2 space-y-2">
              <p className="text-sm text-slate-400">
                {t("dashboard.adminWorkspace")}
              </p>
              <div className="flex gap-2">
                <Link
                  href="/settings"
                  className="rounded bg-slate-800 px-3 py-2 text-xs text-slate-100 hover:bg-slate-700"
                >
                  {t("dashboard.manageSettings")}
                </Link>
                <Link
                  href="/devices"
                  className="rounded border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
                >
                  {t("dashboard.registerDevices")}
                </Link>
              </div>
            </div>
          ) : !canAcknowledge ? (
            <p className="mt-2 text-sm text-slate-400">
              {t("dashboard.viewerWorkspace")}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              {t("dashboard.operatorWorkspace")}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-5">
        <div className="min-w-0 xl:col-span-3">
          <LiveHeartRateChart data={chartData} />
        </div>
        <div className="min-w-0 xl:col-span-2">
          <DeviceStatusTable devices={devices} telemetryByDevice={byDevice} />
        </div>
      </section>
    </main>
  );
}
