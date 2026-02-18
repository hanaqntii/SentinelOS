"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { canPerformAction } from "@/lib/rbac";
import { deviceApi } from "@/services/api";
import { useAuthStore, useDeviceStore, useTelemetryStore } from "@/store";
import type { DeviceStatus } from "@/types";

const STATUS_OPTIONS: Array<{ value: "all" | DeviceStatus }> = [
  { value: "all" },
  { value: "online" },
  { value: "offline" },
  { value: "critical" }
];

const statusClasses: Record<DeviceStatus, string> = {
  online: "border-emerald-700/70 bg-emerald-500/10 text-emerald-300",
  offline: "border-slate-600 bg-slate-700/20 text-slate-300",
  critical: "border-rose-700/70 bg-rose-500/10 text-rose-300"
};

export function DevicesList() {
  const { t } = useI18n();
  const role = useAuthStore((state) => state.user?.role ?? "viewer");
  const devices = useDeviceStore((state) => state.devices);
  const isLoading = useDeviceStore((state) => state.isLoading);
  const fetchDevices = useDeviceStore((state) => state.fetchDevices);
  const upsertDevice = useDeviceStore((state) => state.upsertDevice);
  const byDevice = useTelemetryStore((state) => state.byDevice);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | DeviceStatus>("all");
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDevices({
        search: search.trim() || undefined,
        status: status === "all" ? undefined : status
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchDevices, search, status]);

  const canRegister = canPerformAction(role, "devices.register");
  const canOperate = canPerformAction(role, "devices.control");
  const roleMessage = canRegister
    ? t("devicesPage.adminMessage")
    : canOperate
      ? t("devicesPage.operatorMessage")
      : t("devicesPage.viewerMessage");

  const quickStats = useMemo(() => {
    const online = devices.filter((device) => device.status === "online").length;
    const offline = devices.filter((device) => device.status === "offline").length;
    const critical = devices.filter((device) => device.status === "critical").length;
    return { online, offline, critical };
  }, [devices]);

  const handleRegister = async () => {
    if (!canRegister) {
      return;
    }

    try {
      setIsRegistering(true);
      const nextIndex = devices.length + 1;
      const response = await deviceApi.register({
        name: `Wearable Node ${nextIndex}`,
        status: "online",
        firmwareVersion: "2.1.0",
        batteryLevel: 100
      });
      upsertDevice(response.data);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{t("devicesPage.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">{t("devicesPage.subtitle")}</p>
        </div>
        <button
          type="button"
          disabled={!canRegister || isRegistering}
          onClick={() => void handleRegister()}
          className="rounded bg-brand-600 px-3 py-2 text-xs font-medium hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {canRegister
            ? isRegistering
              ? t("devicesPage.registering")
              : t("devicesPage.registerMock")
            : t("devicesPage.adminOnly")}
        </button>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-slate-100">
          {t("devicesPage.roleMode")}: {t(`roleTitle.${role}`)}
        </p>
        <p className="mt-1 text-sm text-slate-400">{roleMessage}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("devicesPage.online")}</p>
          <p className="mt-2 text-2xl font-semibold">{quickStats.online}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("devicesPage.offline")}</p>
          <p className="mt-2 text-2xl font-semibold">{quickStats.offline}</p>
        </div>
        <div className="rounded-xl border border-rose-700/50 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t("devicesPage.critical")}</p>
          <p className="mt-2 text-2xl font-semibold text-rose-300">{quickStats.critical}</p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("devicesPage.searchPlaceholder")}
          className="md:col-span-3 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none ring-brand-600 focus:ring-1"
        />
        <div className="md:col-span-2 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => {
            const active = option.value === status;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                className={`rounded border px-3 py-2 text-xs ${
                  active
                    ? "border-brand-600 bg-brand-600/10 text-slate-100"
                    : "border-slate-700 text-slate-300 hover:bg-slate-900"
                }`}
              >
                {option.value === "all" ? t("devicesPage.all") : t(`status.${option.value}`)}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold text-slate-100">{t("devicesPage.inventory")}</p>
        </div>

        {isLoading ? (
          <div className="px-4 py-6 text-sm text-slate-400">{t("devicesPage.loading")}</div>
        ) : devices.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-400">{t("devicesPage.empty")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-slate-950/60 text-left text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t("dashboard.device")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("dashboard.status")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("dashboard.battery")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("devicesPage.firmware")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("dashboard.latestHeartRate")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("devicesPage.action")}</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => {
                  const latest = byDevice[device.id]?.[0];
                  return (
                    <tr key={device.id} className="border-t border-slate-800 text-slate-200">
                      <td className="px-4 py-3">
                        <p className="font-medium">{device.name}</p>
                        <p className="text-xs text-slate-400">{device.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded border px-2 py-0.5 text-xs capitalize ${statusClasses[device.status]}`}
                        >
                          {t(`status.${device.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{latest?.battery ?? device.batteryLevel}%</td>
                      <td className="px-4 py-3">{device.firmwareVersion}</td>
                      <td className="px-4 py-3">
                        {latest?.heartRate ? `${latest.heartRate} bpm` : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/devices/${device.id}`}
                          className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800"
                        >
                          {t("devicesPage.openDetail")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
