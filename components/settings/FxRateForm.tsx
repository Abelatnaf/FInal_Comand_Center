"use client";

import { useActionState } from "react";
import { setFxRate, type ActionState } from "@/app/(app)/settings/actions";
import { todayIso, isOlderThanDays, formatShortDate } from "@/lib/date";

export function FxRateForm({ current }: { current: { etb_per_usd: number; effective_on: string; source: string } | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setFxRate, undefined);
  const stale = current ? isOlderThanDays(current.effective_on, 7) : false;

  return (
    <div className="card">
      <div className="row">
        <p className="section-label mb-2">Today&rsquo;s rate</p>
        {current ? (
          <p className="text-[15px] text-text">
            <span className="num">{current.etb_per_usd}</span> ETB/USD · {current.source} · set {formatShortDate(current.effective_on)}
          </p>
        ) : (
          <p className="text-[15px] text-alarm">No rate set. Transactions in ETB can&rsquo;t be logged yet.</p>
        )}
        {stale && <p className="text-urgent text-[13px] mt-1">This rate is more than 7 days old.</p>}
      </div>
      <form action={formAction} className="row flex flex-col gap-3">
        <div>
          <label className="section-label block mb-1.5" htmlFor="effective_on">
            Date
          </label>
          <input id="effective_on" name="effective_on" type="date" defaultValue={todayIso()} className="input" />
        </div>
        <div>
          <label className="section-label block mb-1.5" htmlFor="etb_per_usd">
            ETB per USD
          </label>
          <input id="etb_per_usd" name="etb_per_usd" type="number" step="0.0001" min="0.0001" required className="input num" />
        </div>
        <div>
          <label className="section-label block mb-1.5" htmlFor="source">
            Source
          </label>
          <select id="source" name="source" defaultValue="manual" className="input">
            <option value="official">Official</option>
            <option value="parallel">Parallel</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        {state?.error && <p className="text-alarm text-[14px]">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "Saving…" : "Save rate"}
        </button>
      </form>
    </div>
  );
}
