"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { deviceApi, settingsApi } from "@/services/api";
import { useDeviceStore, useSettingsStore } from "@/store";
import type { GeofenceConfig, ThresholdConfig, User, UserRole } from "@/types";

const ROLE_OPTIONS: UserRole[] = ["admin", "operator", "viewer"];

export function SettingsConsole() {
  const { t } = useI18n();
  const { thresholds, geofence, fetchThresholds, updateThresholds, updateGeofence, isLoading } =
    useSettingsStore();
  const upsertDevice = useDeviceStore((state) => state.upsertDevice);

  const [thresholdDraft, setThresholdDraft] = useState<ThresholdConfig>(thresholds);
  const [geofenceDraft, setGeofenceDraft] = useState<GeofenceConfig>(geofence);
  const [users, setUsers] = useState<User[]>([]);
  const [isRegisteringDevice, setIsRegisteringDevice] = useState(false);
  const [deviceName, setDeviceName] = useState("Worker Node");
  const [firmwareVersion, setFirmwareVersion] = useState("2.1.0");
  const [initialBattery, setInitialBattery] = useState(100);

  useEffect(() => {
    void (async () => {
      await fetchThresholds();
      const usersResponse = await settingsApi.listUsers();
      setUsers(usersResponse.data);
    })();
  }, [fetchThresholds]);

  useEffect(() => {
    setThresholdDraft(thresholds);
  }, [thresholds]);

  useEffect(() => {
    setGeofenceDraft(geofence);
  }, [geofence]);

  const hasThresholdChanges = useMemo(
    () => JSON.stringify(thresholdDraft) !== JSON.stringify(thresholds),
    [thresholdDraft, thresholds]
  );
  const hasGeofenceChanges = useMemo(
    () => JSON.stringify(geofenceDraft) !== JSON.stringify(geofence),
    [geofence, geofenceDraft]
  );

  const saveThresholds = async () => {
    await updateThresholds(thresholdDraft);
  };

  const saveGeofence = async () => {
    await updateGeofence(geofenceDraft);
  };

  const registerDevice = async () => {
    try {
      setIsRegisteringDevice(true);
      const response = await deviceApi.register({
        name: deviceName.trim() || "Worker Node",
        status: "online",
        firmwareVersion: firmwareVersion.trim() || "2.1.0",
        batteryLevel: Math.max(0, Math.min(100, initialBattery))
      });
      upsertDevice(response.data);
      setDeviceName("Worker Node");
      setFirmwareVersion("2.1.0");
      setInitialBattery(100);
    } finally {
      setIsRegisteringDevice(false);
    }
  };

  const changeRole = async (userId: string, role: UserRole) => {
    const response = await settingsApi.updateUserRole(userId, role);
    setUsers((prev) => prev.map((entry) => (entry.id === userId ? response.data : entry)));
  };

  return (
    <main className="space-y-6 p-3 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">{t("settings.title")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("settings.description")}</p>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-slate-100">{t("settings.thresholds")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-slate-300">
            {t("settings.warningHeartRate")}
            <input
              type="number"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={thresholdDraft.warningHeartRate}
              onChange={(event) =>
                setThresholdDraft((prev) => ({ ...prev, warningHeartRate: Number(event.target.value) }))
              }
            />
          </label>
          <label className="text-xs text-slate-300">
            {t("settings.criticalHeartRate")}
            <input
              type="number"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={thresholdDraft.criticalHeartRate}
              onChange={(event) =>
                setThresholdDraft((prev) => ({ ...prev, criticalHeartRate: Number(event.target.value) }))
              }
            />
          </label>
          <label className="text-xs text-slate-300">
            {t("settings.criticalBodyTemperature")}
            <input
              type="number"
              step="0.1"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={thresholdDraft.criticalBodyTemperature}
              onChange={(event) =>
                setThresholdDraft((prev) => ({
                  ...prev,
                  criticalBodyTemperature: Number(event.target.value)
                }))
              }
            />
          </label>
          <label className="text-xs text-slate-300">
            {t("settings.lowBatteryThreshold")}
            <input
              type="number"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={thresholdDraft.lowBatteryThreshold}
              onChange={(event) =>
                setThresholdDraft((prev) => ({ ...prev, lowBatteryThreshold: Number(event.target.value) }))
              }
            />
          </label>
          <label className="text-xs text-slate-300">
            {t("settings.weakSignalThreshold")}
            <input
              type="number"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={thresholdDraft.weakSignalThreshold}
              onChange={(event) =>
                setThresholdDraft((prev) => ({ ...prev, weakSignalThreshold: Number(event.target.value) }))
              }
            />
          </label>
          <label className="text-xs text-slate-300">
            {t("settings.noTelemetrySeconds")}
            <input
              type="number"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={thresholdDraft.noTelemetrySeconds}
              onChange={(event) =>
                setThresholdDraft((prev) => ({ ...prev, noTelemetrySeconds: Number(event.target.value) }))
              }
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void saveThresholds()}
          disabled={!hasThresholdChanges || isLoading}
          className="mt-4 rounded bg-brand-600 px-3 py-2 text-xs font-medium hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("settings.saveThresholds")}
        </button>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-slate-100">{t("settings.geofenceConfig")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-slate-300">
            {t("settings.geofenceLatitude")}
            <input
              type="number"
              step="0.000001"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={geofenceDraft.centerLatitude}
              onChange={(event) =>
                setGeofenceDraft((prev) => ({ ...prev, centerLatitude: Number(event.target.value) }))
              }
            />
          </label>
          <label className="text-xs text-slate-300">
            {t("settings.geofenceLongitude")}
            <input
              type="number"
              step="0.000001"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={geofenceDraft.centerLongitude}
              onChange={(event) =>
                setGeofenceDraft((prev) => ({ ...prev, centerLongitude: Number(event.target.value) }))
              }
            />
          </label>
          <label className="text-xs text-slate-300">
            {t("settings.geofenceRadius")}
            <input
              type="number"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={geofenceDraft.radiusMeters}
              onChange={(event) =>
                setGeofenceDraft((prev) => ({ ...prev, radiusMeters: Number(event.target.value) }))
              }
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void saveGeofence()}
          disabled={!hasGeofenceChanges || isLoading}
          className="mt-4 rounded bg-brand-600 px-3 py-2 text-xs font-medium hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t("settings.saveGeofence")}
        </button>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-slate-100">{t("settings.deviceRegistration")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-slate-300">
            {t("settings.deviceName")}
            <input
              type="text"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={deviceName}
              onChange={(event) => setDeviceName(event.target.value)}
            />
          </label>
          <label className="text-xs text-slate-300">
            {t("settings.firmwareVersion")}
            <input
              type="text"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={firmwareVersion}
              onChange={(event) => setFirmwareVersion(event.target.value)}
            />
          </label>
          <label className="text-xs text-slate-300">
            {t("settings.initialBattery")}
            <input
              type="number"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm"
              value={initialBattery}
              onChange={(event) => setInitialBattery(Number(event.target.value))}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void registerDevice()}
          disabled={isRegisteringDevice}
          className="mt-4 rounded bg-brand-600 px-3 py-2 text-xs font-medium hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRegisteringDevice ? t("settings.registering") : t("settings.registerDevice")}
        </button>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm font-semibold text-slate-100">{t("settings.roleManagement")}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-slate-950/50 text-left text-slate-400">
              <tr>
                <th className="px-3 py-2">{t("settings.userId")}</th>
                <th className="px-3 py-2">{t("common.role")}</th>
                <th className="px-3 py-2">{t("settings.updateRole")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-800">
                  <td className="px-3 py-2 text-slate-200">{user.id}</td>
                  <td className="px-3 py-2 text-slate-300">{t(`roleTitle.${user.role}`)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={user.role}
                      onChange={(event) => void changeRole(user.id, event.target.value as UserRole)}
                      className="rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {t(`roleTitle.${role}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
