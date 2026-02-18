"use client";

import { useI18n } from "@/lib/i18n/use-i18n";
import type { Device, Telemetry } from "@/types";

interface DeviceStatusTableProps {
  devices: Device[];
  telemetryByDevice: Record<string, Telemetry[]>;
}

const statusClasses: Record<Device["status"], string> = {
  online: "bg-emerald-500/15 text-emerald-300 border-emerald-700/60",
  offline: "bg-slate-700/20 text-slate-300 border-slate-600",
  critical: "bg-rose-500/15 text-rose-300 border-rose-700/60"
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

export function DeviceStatusTable({ devices, telemetryByDevice }: DeviceStatusTableProps) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-4 py-3">
        <p className="text-sm font-semibold text-slate-100">{t("dashboard.deviceStatus")}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-slate-950/60 text-left text-slate-400">
            <tr>
              <th className="px-4 py-2.5 font-medium">{t("dashboard.device")}</th>
              <th className="px-4 py-2.5 font-medium">{t("dashboard.status")}</th>
              <th className="px-4 py-2.5 font-medium">{t("dashboard.battery")}</th>
              <th className="px-4 py-2.5 font-medium">{t("dashboard.latestHeartRate")}</th>
              <th className="px-4 py-2.5 font-medium">{t("dashboard.lastSeen")}</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => {
              const latest = telemetryByDevice[device.id]?.[0];
              const heartRate = latest?.heartRate;
              const battery = latest?.battery ?? device.batteryLevel;
              const lastSeen = latest?.timestamp ?? device.lastSeen;

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
                  <td className="px-4 py-3">{battery}%</td>
                  <td className="px-4 py-3">
                    {typeof heartRate === "number" ? `${heartRate} bpm` : "-"}
                  </td>
                  <td className="px-4 py-3">{formatTime(lastSeen)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
