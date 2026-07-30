"use client";

import { useState, useTransition } from "react";
import { setObligationRecurrence } from "@/app/(app)/bills/actions";

const OPTIONS: { label: string; months: number | null }[] = [
  { label: "Doesn't repeat", months: null },
  { label: "Monthly", months: 1 },
  { label: "Every term (6 mo)", months: 6 },
  { label: "Yearly", months: 12 },
];

export function RecurrenceControl({
  obligationId,
  intervalMonths,
  hasDueDate,
}: {
  obligationId: string;
  intervalMonths: number | null;
  hasDueDate: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function choose(months: number | null) {
    setError(null);
    startTransition(async () => {
      const res = await setObligationRecurrence(obligationId, months);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="card">
      <div className="row">
        <p className="section-label mb-1">Repeat</p>
        <p className="text-[13px] text-muted">
          The next copy is created automatically once this one&rsquo;s due date passes — same title, payer and
          amount, dated one interval later.
        </p>
      </div>

      <div className="row">
        <select
          className="input"
          aria-label="Repeat interval"
          disabled={busy}
          value={intervalMonths ?? ""}
          onChange={(e) => choose(e.target.value === "" ? null : Number(e.target.value))}
        >
          {OPTIONS.map((o) => (
            <option key={o.label} value={o.months ?? ""}>
              {o.label}
            </option>
          ))}
        </select>

        {/* A repeat is anchored to the due date, so without one nothing can
            advance. Say so instead of letting the setting quietly do nothing. */}
        {intervalMonths !== null && !hasDueDate && (
          <p className="text-urgent text-[13px] mt-2">
            Set a due date above — a repeat needs one to know when the next copy is due.
          </p>
        )}

        {error && <p className="text-alarm text-[13px] mt-2">{error}</p>}
      </div>
    </div>
  );
}
