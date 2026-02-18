"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { canPerformAction } from "@/lib/rbac";
import { useAlertStore, useAuthStore } from "@/store";
import type { AlertSeverity } from "@/types";

const SEVERITY_OPTIONS: Array<{ value: "all" | AlertSeverity }> = [
  { value: "all" },
  { value: "critical" },
  { value: "medium" },
  { value: "low" }
];

const severityClasses: Record<AlertSeverity, string> = {
  critical: "border-rose-700/70 bg-rose-500/10 text-rose-300",
  medium: "border-amber-700/70 bg-amber-500/10 text-amber-300",
  low: "border-sky-700/70 bg-sky-500/10 text-sky-300"
};

const severityStripClasses: Record<AlertSeverity, string> = {
  critical: "bg-rose-500",
  medium: "bg-amber-500",
  low: "bg-sky-500"
};

const severityRank: Record<AlertSeverity, number> = {
  critical: 0,
  medium: 1,
  low: 2
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

export function AlertsPanel() {
  const { t } = useI18n();
  const role = useAuthStore((state) => state.user?.role ?? "viewer");
  const alerts = useAlertStore((state) => state.alerts);
  const isLoading = useAlertStore((state) => state.isLoading);
  const fetchAlerts = useAlertStore((state) => state.fetchAlerts);
  const acknowledge = useAlertStore((state) => state.acknowledge);

  const [severity, setSeverity] = useState<"all" | AlertSeverity>("all");
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void fetchAlerts(severity === "all" ? undefined : severity);
  }, [fetchAlerts, severity]);

  const canAcknowledge = canPerformAction(role, "alerts.acknowledge");
  const pendingCount = useMemo(() => alerts.filter((alert) => !alert.acknowledged).length, [alerts]);
  const sortedAlerts = useMemo(
    () =>
      [...alerts].sort((a, b) => {
        if (severityRank[a.severity] !== severityRank[b.severity]) {
          return severityRank[a.severity] - severityRank[b.severity];
        }

        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }),
    [alerts]
  );

  useEffect(() => {
    if (!feedRef.current || sortedAlerts.length === 0) {
      return;
    }

    // Keep newest incident visible for control-room workflow.
    feedRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [sortedAlerts[0]?.id, sortedAlerts.length]);

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">{t("alertsPage.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {t("alertsPage.subtitle")}
          </p>
        </div>
        <div className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">
          {t("alertsPage.pending")}: {pendingCount}
        </div>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-slate-100">
          {t("alertsPage.roleMode")}: {t(`roleTitle.${role}`)}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {canAcknowledge ? t("alertsPage.responseEnabled") : t("alertsPage.readOnly")}
        </p>
      </section>

      <section className="flex flex-wrap gap-2">
        {SEVERITY_OPTIONS.map((option) => {
          const active = option.value === severity;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setSeverity(option.value)}
              className={`rounded-md border px-3 py-1.5 text-xs ${
                active
                  ? "border-brand-600 bg-brand-600/10 text-slate-100"
                  : "border-slate-700 text-slate-300 hover:bg-slate-900"
              }`}
            >
              {option.value === "all" ? t("alertsPage.all") : t(`severity.${option.value}`)}
            </button>
          );
        })}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-100">{t("alertsPage.alertStream")}</p>
            <span className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300">
              {t("alertsPage.pending")}: {pendingCount}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="px-4 py-6 text-sm text-slate-400">{t("alertsPage.loading")}</div>
        ) : sortedAlerts.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-400">{t("alertsPage.empty")}</div>
        ) : (
          <div ref={feedRef} className="max-h-[68vh] space-y-2 overflow-y-auto p-3">
            {sortedAlerts.map((alert) => (
              <article
                key={alert.id}
                className="grid grid-cols-[4px_1fr] overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50"
              >
                <div className={severityStripClasses[alert.severity]} />
                <div className="space-y-2 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded border border-slate-700 px-2 py-0.5 text-slate-300">
                      {formatTime(alert.timestamp)}
                    </span>
                    <span
                      className={`inline-flex rounded border px-2 py-0.5 capitalize ${severityClasses[alert.severity]}`}
                    >
                      {t(`severity.${alert.severity}`)}
                    </span>
                    <span className="text-slate-400">{t(`alertType.${alert.type}`)}</span>
                    <Link href={`/devices/${alert.deviceId}`} className="text-brand-600 hover:text-brand-700">
                      {alert.deviceId}
                    </Link>
                  </div>

                  <p className="text-sm text-slate-200">{alert.message}</p>

                  <div className="flex items-center justify-end">
                    {alert.acknowledged ? (
                      <span className="text-xs text-emerald-300">{t("alertsPage.acknowledged")}</span>
                    ) : (
                      <button
                        type="button"
                        disabled={!canAcknowledge}
                        onClick={() => void acknowledge(alert.id)}
                        className="rounded bg-brand-600 px-2.5 py-1 text-xs hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {canAcknowledge ? t("alertsPage.acknowledge") : t("alertsPage.readOnlyAction")}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
