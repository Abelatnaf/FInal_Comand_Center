"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Glass } from "@/components/glass/Glass";
import { ChartTooltip } from "./ChartTooltip";
import { CHART_GRID_COLOR, CHART_AXIS_COLOR, CATEGORY_SHADES } from "@/lib/chart-colors";

export type YearOverYearPoint = { month: string } & Record<string, number | string>;

const axisTick = { fill: CHART_AXIS_COLOR, fontSize: 11, fontFamily: "var(--font-body)" };

export function YearOverYearChart({ data, years }: { data: YearOverYearPoint[]; years: string[] }) {
  return (
    <Glass className="p-6">
      <div className="ios-headline mb-4">Spending — Year over Year</div>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
            <XAxis dataKey="month" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART_GRID_COLOR }} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: CHART_AXIS_COLOR }} iconType="circle" iconSize={8} />
            {years.map((year, i) => (
              <Bar
                key={year}
                dataKey={year}
                name={year}
                fill={CATEGORY_SHADES[(i * 3) % CATEGORY_SHADES.length]}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Glass>
  );
}
