import { withLatency } from "@/services/api/mock-utils";
import { mockDb } from "@/services/api/mock-db";
import type { Alert, AlertSeverity } from "@/types";

export const alertApi = {
  async list(severity?: AlertSeverity) {
    const alerts = severity
      ? mockDb.alerts.filter((entry) => entry.severity === severity)
      : [...mockDb.alerts];

    return withLatency<Alert[]>(alerts);
  },

  async acknowledge(alertId: string) {
    const alert = mockDb.alerts.find((entry) => entry.id === alertId);

    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.acknowledged = true;
    return withLatency<Alert>(alert);
  },

  async push(alert: Alert) {
    mockDb.alerts.unshift(alert);
    return withLatency<Alert>(alert);
  }
};
