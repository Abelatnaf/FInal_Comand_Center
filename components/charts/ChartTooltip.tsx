"use client";

import { fmtUsd } from "@/lib/format";

type Payload = {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string | number;
};

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Payload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass px-3 py-2.5 text-xs" style={{ minWidth: 140 }}>
      <div className="text-text-dim mb-1.5 num">{label}</div>
      <div className="flex flex-col gap-1">
        {payload.map((p) => (
          <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-text-dim">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: p.color }}
              />
              {p.name}
            </span>
            <span className="num text-text">{fmtUsd(p.value ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
