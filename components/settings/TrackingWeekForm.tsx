"use client";

import { useActionState } from "react";
import { updateTrackingStartDate, type ActionState } from "@/app/(app)/settings/actions";

export function TrackingWeekForm({ trackingStartDate }: { trackingStartDate: string | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateTrackingStartDate, undefined);

  return (
    <div className="card">
      <div className="row">
        <p className="section-label mb-1">Tracking weeks</p>
        <p className="text-[13px] text-muted">
          The start date used to number weeks in the Ledger filter and the Now label (e.g. &ldquo;Week 3&rdquo;).
        </p>
      </div>
      <form action={formAction} className="row flex items-center gap-2">
        <input
          name="tracking_start_date"
          type="date"
          defaultValue={trackingStartDate ?? ""}
          className="input flex-1"
          aria-label="Tracking start date"
        />
        <button type="submit" disabled={pending} className="btn">
          {pending ? "…" : "Save"}
        </button>
      </form>
      {state?.error && <p className="row pt-0 text-alarm text-[13px]">{state.error}</p>}
    </div>
  );
}
