"use client";

import { useState, useTransition } from "react";
import { setInstallmentPlan } from "@/app/(app)/bills/actions";
import { Amount } from "@/components/money/Amount";
import { formatShortDate } from "@/lib/date";
import { fromMinor, toMinor } from "@/lib/money";

export type InstallmentRow = {
  installment_id: string;
  seq: number;
  due_on: string | null;
  amount_usd_minor: number;
  amount_covered_minor: number;
  is_settled: boolean;
  is_past_due: boolean;
};

type Draft = { due_on: string; amount: string };

export function InstallmentPlan({
  obligationId,
  installments,
  obligationTotalMinor,
}: {
  obligationId: string;
  installments: InstallmentRow[];
  obligationTotalMinor: number;
}) {
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    installments.length > 0
      ? installments.map((i) => ({ due_on: i.due_on ?? "", amount: fromMinor(BigInt(i.amount_usd_minor)) }))
      : [{ due_on: "", amount: "" }]
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  // Shown as a check against the bill's own total, not enforced -- a plan that
  // deliberately covers only part of a bill is legitimate, so this informs
  // rather than blocks.
  let plannedMinor = 0n;
  for (const d of drafts) {
    try {
      if (d.amount.trim() !== "") plannedMinor += toMinor(d.amount.trim());
    } catch {
      // A half-typed number isn't an error worth shouting about mid-keystroke.
    }
  }
  const totalMinor = BigInt(obligationTotalMinor);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await setInstallmentPlan(
        obligationId,
        drafts.map((d) => ({ due_on: d.due_on || null, amount: d.amount }))
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="card">
        <div className="row flex items-center justify-between gap-3">
          <p className="section-label">Payment plan</p>
          <button type="button" className="text-accent text-[13px]" onClick={() => setEditing(true)}>
            {installments.length > 0 ? "Edit" : "Add a plan"}
          </button>
        </div>

        {installments.length === 0 && (
          <p className="row text-[14px] text-muted">
            No plan yet. Split this bill into scheduled parts to see what&rsquo;s due next rather than the
            whole balance.
          </p>
        )}

        {installments.map((i) => (
          <div key={i.installment_id} className="row flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] text-text">
                Part {i.seq}
                {i.is_settled && <span className="text-positive"> · paid</span>}
                {!i.is_settled && i.is_past_due && <span className="text-alarm"> · overdue</span>}
              </p>
              <p className="text-[13px] text-muted">
                {i.due_on ? formatShortDate(i.due_on) : "No date"}
                {!i.is_settled && i.amount_covered_minor > 0 && (
                  <> · part-covered</>
                )}
              </p>
            </div>
            <Amount
              minor={BigInt(i.amount_usd_minor)}
              currency="USD"
              className={i.is_settled ? "text-muted shrink-0" : "text-text shrink-0"}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row">
        <p className="section-label">Payment plan</p>
      </div>

      {drafts.map((d, i) => (
        <div key={i} className="row flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-muted">Part {i + 1}</p>
            {drafts.length > 1 && (
              <button
                type="button"
                className="text-alarm text-[13px]"
                onClick={() => setDrafts((prev) => prev.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              className="input"
              aria-label={`Part ${i + 1} due date`}
              value={d.due_on}
              onChange={(e) =>
                setDrafts((prev) => prev.map((p, idx) => (idx === i ? { ...p, due_on: e.target.value } : p)))
              }
            />
            <input
              inputMode="decimal"
              placeholder="0.00"
              className="input num"
              aria-label={`Part ${i + 1} amount in USD`}
              value={d.amount}
              onChange={(e) =>
                setDrafts((prev) => prev.map((p, idx) => (idx === i ? { ...p, amount: e.target.value } : p)))
              }
            />
          </div>
        </div>
      ))}

      <div className="row flex items-center justify-between">
        <button
          type="button"
          className="text-accent text-[14px]"
          onClick={() => setDrafts((prev) => [...prev, { due_on: "", amount: "" }])}
        >
          + Add a part
        </button>
        <div className="text-right">
          <p className="section-label">Planned</p>
          <Amount
            minor={plannedMinor}
            currency="USD"
            className={plannedMinor === totalMinor ? "text-positive" : "text-text"}
          />
        </div>
      </div>

      {plannedMinor !== totalMinor && (
        <p className="row text-[13px] text-muted">
          The bill total is <Amount minor={totalMinor} currency="USD" className="text-text" />. A plan
          doesn&rsquo;t have to match it, but usually will.
        </p>
      )}

      {error && <p className="row text-alarm text-[13px]">{error}</p>}

      <div className="row flex gap-2">
        <button type="button" className="btn flex-1" disabled={busy} onClick={() => setEditing(false)}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save plan"}
        </button>
      </div>
    </div>
  );
}
