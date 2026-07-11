"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Glass } from "@/components/glass/Glass";
import { ChartTooltip } from "./ChartTooltip";
import { CHART_GRID_COLOR, CHART_AXIS_COLOR, CHART_LINE_COLOR, CATEGORY_SHADES } from "@/lib/chart-colors";

export type MonthlyCategoryPoint = { month: string } & Record<string, number | string>;
export type MonthlyRollupRow = {
  month: string;
  total_expenses: number;
  total_income: number;
  net: number;
  running_balance: number;
};

const axisTick = { fill: CHART_AXIS_COLOR, fontSize: 11, fontFamily: "var(--font-mono)" };

export function MonthlyRollupCharts({
  categoryData,
  categoryNames,
  balanceData,
}: {
  categoryData: MonthlyCategoryPoint[];
  categoryNames: string[];
  balanceData: MonthlyRollupRow[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 mb-4">
      <Glass className="p-6">
        <div className="font-display text-lg font-semibold mb-4">Category Breakdown — By Month</div>
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={categoryData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={24}>
              <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
              <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART_GRID_COLOR }} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: CHART_AXIS_COLOR }} iconType="circle" iconSize={8} />
              {categoryNames.map((name, i) => (
                <Bar
                  key={name}
                  dataKey={name}
                  name={name}
                  stackId="categories"
                  fill={CATEGORY_SHADES[i % CATEGORY_SHADES.length]}
                  stroke="#000000"
                  strokeWidth={2}
                  radius={i === categoryNames.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Glass>

      <Glass className="p-6">
        <div className="font-display text-lg font-semibold mb-4">Running Balance</div>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={balanceData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
              <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART_GRID_COLOR }} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={54} />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="running_balance"
                name="Balance"
                stroke={CHART_LINE_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: "#000000", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Glass>
    </div>
  );
}
