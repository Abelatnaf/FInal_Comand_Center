"use client";

import {
  ResponsiveContainer,
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
import { CHART_GRID_COLOR, CHART_AXIS_COLOR, CHART_LINE_COLOR, CHART_LINE_SECONDARY } from "@/lib/chart-colors";

export type WeeklyRow = {
  cadet_week: number;
  week_start: string;
  week_end: string;
  total_expenses: number;
  necessary: number;
  discretionary: number;
  total_income: number;
  net: number;
  running_balance: number;
};

const axisTick = { fill: CHART_AXIS_COLOR, fontSize: 11, fontFamily: "var(--font-body)" };

export function WeeklyRollupCharts({ rows }: { rows: WeeklyRow[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      <Glass className="p-6">
        <div className="ios-headline mb-4">Weekly Cash Flow</div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
              <XAxis dataKey="cadet_week" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART_GRID_COLOR }} interval={4} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: CHART_AXIS_COLOR }} iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="total_income" name="Income" stroke={CHART_LINE_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#000000", strokeWidth: 2 }} />
              <Line type="monotone" dataKey="total_expenses" name="Spent" stroke={CHART_LINE_SECONDARY} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#000000", strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Glass>

      <Glass className="p-6">
        <div className="ios-headline mb-4">Running Balance</div>
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
              <XAxis dataKey="cadet_week" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART_GRID_COLOR }} interval={4} />
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
