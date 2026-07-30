"use client";

import { useState, useTransition } from "react";
import { deleteFxRate } from "@/app/(app)/settings/actions";
import { formatShortDate } from "@/lib/date";

type FxRate = {
  id: string;
  etb_per_usd: number;
  effective_on: string;
  source: string;
};

export function FxRateHistory({ rates }: { rates: FxRate[] }) {
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (rates.length === 0) return null;

  const shown = expanded ? rates : rates.slice(0, 5);

  function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    startTransition(async () => {
      const res = await deleteFxRate(id);
      setBusyId(null);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="card">
      <div className="row">
        <p className="section-label mb-1">Rate history</p>
        <p className="text-[13px] text-muted">
          Every ETB figure is frozen against the rate that was current when it was logged. Deleting a
          rate here changes future entries and coverage estimates only — it never re-prices anything
          already recorded.
        </p>
      </div>

      {shown.map((r) => (
        <div key={r.id} className="row flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] text-text num">{r.etb_per_usd} ETB/USD</p>
            <p className="text-[13px] text-muted">
              {formatShortDate(r.effective_on)} · {r.source}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-destructive shrink-0"
            style={{ minHeight: 0, padding: "8px 14px" }}
            disabled={busyId === r.id}
            onClick={() => handleDelete(r.id)}
          >
            {busyId === r.id ? "…" : "Delete"}
          </button>
        </div>
      ))}

      {error && <p className="row text-alarm text-[13px]">{error}</p>}

      {rates.length > 5 && (
        <button type="button" className="row w-full text-left text-muted text-[14px]" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show fewer" : `Show all ${rates.length}`}
        </button>
      )}
    </div>
  );
}
