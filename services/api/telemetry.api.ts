import { withLatency } from "@/services/api/mock-utils";
import { mockDb } from "@/services/api/mock-db";
import type { Telemetry, TelemetryQuery } from "@/types";

export const telemetryApi = {
  async ingest(payload: Omit<Telemetry, "id">) {
    const telemetry: Telemetry = {
      ...payload,
      id: `tel-${String(mockDb.telemetry.length + 1).padStart(3, "0")}`
    };

    mockDb.telemetry.unshift(telemetry);

    return withLatency<Telemetry>(telemetry);
  },

  async list(query?: TelemetryQuery) {
    let rows = [...mockDb.telemetry];

    if (query?.deviceId) {
      rows = rows.filter((entry) => entry.deviceId === query.deviceId);
    }

    if (query?.from) {
      rows = rows.filter((entry) => new Date(entry.timestamp).getTime() >= new Date(query.from!).getTime());
    }

    if (query?.to) {
      rows = rows.filter((entry) => new Date(entry.timestamp).getTime() <= new Date(query.to!).getTime());
    }

    if (query?.limit) {
      rows = rows.slice(0, query.limit);
    }

    return withLatency<Telemetry[]>(rows);
  }
};
