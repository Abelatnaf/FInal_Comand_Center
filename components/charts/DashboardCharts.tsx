"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { fmtUsd } from "@/lib/format";

const compact = (n: number) => {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
};

/* ---------- Net Worth area (dark hero) ---------- */
export function NetWorthArea({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
        No history yet
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="nwStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#bf5af2" />
            <stop offset="55%" stopColor="#5e5ce6" />
            <stop offset="100%" stopColor="#32ade6" />
          </linearGradient>
          <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7d5cf0" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#7d5cf0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={40}
        />
        <YAxis
          orientation="right"
          tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={compact}
          domain={["dataMin - 2000", "dataMax + 2000"]}
        />
        <Tooltip
          cursor={{ stroke: "rgba(255,255,255,0.2)" }}
          contentStyle={{
            background: "#1c1c1e",
            border: "none",
            borderRadius: 10,
            color: "#fff",
            fontSize: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
          labelStyle={{ color: "rgba(255,255,255,0.5)" }}
          formatter={(v) => [fmtUsd(Number(v)), "Net Worth"] as [string, string]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="url(#nwStroke)"
          strokeWidth={2.5}
          fill="url(#nwFill)"
          dot={false}
          activeDot={{ r: 4, fill: "#fff", stroke: "#5e5ce6", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- Cash flow bars (income green / expense red) ---------- */
export function CashFlowBars({ data }: { data: { label: string; income: number; expense: number }[] }) {
  if (data.length === 0) {
    return <div className="h-full flex items-center justify-center stat-label">No activity yet</div>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="22%" barGap={2}>
        <CartesianGrid stroke="var(--separator)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "var(--label-tertiary)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis
          tick={{ fill: "var(--label-tertiary)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={compact}
        />
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
          contentStyle={{
            background: "#fff",
            border: "1px solid var(--hairline)",
            borderRadius: 10,
            fontSize: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
          }}
          formatter={(v, name) => [fmtUsd(Number(v)), name === "income" ? "Income" : "Expenses"] as [string, string]}
        />
        <Bar dataKey="income" fill="#34c759" radius={[3, 3, 0, 0]} maxBarSize={9} />
        <Bar dataKey="expense" fill="#ff3b30" radius={[3, 3, 0, 0]} maxBarSize={9} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ---------- Spending donut ---------- */
export function SpendingDonut({
  data,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
}) {
  const hasData = data.some((d) => d.value > 0);
  return (
    <div className="relative w-full" style={{ height: 176 }}>
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid var(--hairline)",
                borderRadius: 10,
                fontSize: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              }}
              formatter={(v, n) => [fmtUsd(Number(v)), String(n)] as [string, string]}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center stat-label">No spending yet</div>
      )}
      {hasData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[20px] font-bold num tracking-tight">{centerValue}</div>
          <div className="stat-label">{centerLabel}</div>
        </div>
      )}
    </div>
  );
}
