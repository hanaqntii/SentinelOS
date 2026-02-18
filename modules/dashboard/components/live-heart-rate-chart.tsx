"use client";

import { useI18n } from "@/lib/i18n/use-i18n";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

interface LiveHeartRateChartProps {
  data: Array<{
    time: string;
    avgHeartRate: number;
  }>;
}

export function LiveHeartRateChart({ data }: LiveHeartRateChartProps) {
  const { t } = useI18n();

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
        <p className="text-sm font-semibold text-slate-100">{t("dashboard.chartTitle")}</p>
        <p className="text-xs text-slate-400">{t("dashboard.chartSubtitle")}</p>
      </div>

      <div className="h-56 w-full sm:h-72 lg:h-80">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={30}
              domain={[40, 180]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #334155",
                borderRadius: "0.5rem"
              }}
              labelStyle={{ color: "#cbd5e1" }}
              formatter={(value: number) => [`${value} bpm`, t("dashboard.avgHr")]}
            />
            <Line
              type="monotone"
              dataKey="avgHeartRate"
              stroke="#2563EB"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
