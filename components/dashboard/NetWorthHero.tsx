"use client";

import { useMemo, useState } from "react";
import { NetWorthArea } from "@/components/charts/DashboardCharts";
import { fmtUsd } from "@/lib/format";

type Point = { label: string; value: number };
const RANGES = [
  { key: "1M", n: 2 },
  { key: "6M", n: 6 },
  { key: "1Y", n: 12 },
  { key: "ALL", n: Infinity },
] as const;

export function NetWorthHero({ balance, series }: { balance: number; series: Point[] }) {
  const [range, setRange] = useState<string>("ALL");

  const visible = useMemo(() => {
    const n = RANGES.find((r) => r.key === range)?.n ?? Infinity;
    return n === Infinity ? series : series.slice(Math.max(0, series.length - n));
  }, [series, range]);

  const change = visible.length >= 2 ? visible[visible.length - 1].value - visible[0].value : 0;
  const pct = visible.length >= 2 && visible[0].value !== 0 ? (change / Math.abs(visible[0].value)) * 100 : 0;
  const up = change >= 0;

  return (
    <div className="ledger p-6 md:p-7 flex flex-col min-h-[300px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[15px]" style={{ color: "rgba(255,255,255,0.6)" }}>
            Net Worth
          </div>
          <div className="hero-value mt-1">{fmtUsd(balance)}</div>
          {visible.length >= 2 && (
            <div className="mt-1.5 text-[14px] num" style={{ color: up ? "#30d158" : "#ff453a" }}>
              {up ? "↑" : "↓"} {fmtUsd(Math.abs(change))} ({pct >= 0 ? "+" : ""}
              {pct.toFixed(2)}%)
              <span style={{ color: "rgba(255,255,255,0.5)" }}> · {range === "ALL" ? "All time" : range}</span>
            </div>
          )}
        </div>
        <div className="segmented segmented-dark shrink-0">
          {RANGES.map((r) => (
            <button key={r.key} type="button" data-active={range === r.key} onClick={() => setRange(r.key)}>
              {r.key}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 mt-4 -mb-1">
        <NetWorthArea data={visible} />
      </div>
    </div>
  );
}
