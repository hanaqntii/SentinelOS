import { withLatency } from "@/services/api/mock-utils";
import { mockDb } from "@/services/api/mock-db";

export interface DailyAverage {
  date: string;
  avgHeartRate: number;
  avgBodyTemperature: number;
  avgBattery: number;
}

export const analyticsApi = {
  async getDailyAverages() {
    const day = new Date().toISOString().slice(0, 10);
    const rows = mockDb.telemetry;

    const avgHeartRate = rows.reduce((sum, row) => sum + row.heartRate, 0) / Math.max(rows.length, 1);
    const avgBodyTemperature =
      rows.reduce((sum, row) => sum + row.bodyTemperature, 0) / Math.max(rows.length, 1);
    const avgBattery = rows.reduce((sum, row) => sum + row.battery, 0) / Math.max(rows.length, 1);

    return withLatency<DailyAverage[]>([
      {
        date: day,
        avgHeartRate: Number(avgHeartRate.toFixed(2)),
        avgBodyTemperature: Number(avgBodyTemperature.toFixed(2)),
        avgBattery: Number(avgBattery.toFixed(2))
      }
    ]);
  },

  async exportCsv() {
    const headers = [
      "id",
      "deviceId",
      "heartRate",
      "bodyTemperature",
      "activityLevel",
      "battery",
      "signalStrength",
      "timestamp"
    ];
    const lines = mockDb.telemetry.map((entry) =>
      [
        entry.id,
        entry.deviceId,
        entry.heartRate,
        entry.bodyTemperature,
        entry.activityLevel,
        entry.battery,
        entry.signalStrength,
        entry.timestamp
      ].join(",")
    );

    return withLatency([headers.join(","), ...lines].join("\n"));
  }
};
