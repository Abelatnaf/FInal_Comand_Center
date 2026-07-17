"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts";
import { fmtUsd } from "@/lib/format";
import { CHART_LINE_COLOR, CHART_LINE_SECONDARY } from "@/lib/chart-colors";

const compact = (n: number) => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
};

export type ForecastPoint = { label: string; baseline: number; scenario: number | null };

export function ForecastChart({ data, showScenario }: { data: ForecastPoint[]; showScenario: boolean }) {
  if (data.length === 0) {
    return <div className="h-full flex items-center justify-center stat-label">Not enough data to project yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="var(--separator)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--label-tertiary)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={32}
        />
        <YAxis
          tick={{ fill: "var(--label-tertiary)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={52}
          tickFormatter={compact}
        />
        <ReferenceLine y={0} stroke="var(--label-tertiary)" strokeDasharray="4 4" label={{ value: "Break-even", position: "insideBottomLeft", fill: "var(--label-tertiary)", fontSize: 10 }} />
        <Tooltip
          cursor={{ stroke: "rgba(218,226,253,0.2)" }}
          contentStyle={{
            background: "#131b2e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            color: "#dae2fd",
            fontSize: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
          labelStyle={{ color: "rgba(218,226,253,0.5)" }}
          formatter={(v, name) => [fmtUsd(Number(v)), name === "baseline" ? "Baseline" : "With Scenario"] as [string, string]}
        />
        {data.length > 1 && showScenario && <Legend wrapperStyle={{ fontSize: 12, color: "var(--label-secondary)" }} />}
        <Line
          type="monotone"
          dataKey="baseline"
          name="Baseline"
          stroke={CHART_LINE_COLOR}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: "#fff", stroke: CHART_LINE_COLOR, strokeWidth: 2 }}
        />
        {showScenario && (
          <Line
            type="monotone"
            dataKey="scenario"
            name="With Scenario"
            stroke={CHART_LINE_SECONDARY}
            strokeWidth={2.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 4, fill: "#fff", stroke: CHART_LINE_SECONDARY, strokeWidth: 2 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
