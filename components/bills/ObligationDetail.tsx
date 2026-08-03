"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setObligationWaived, deleteObligation, duplicateObligation } from "@/app/(app)/bills/actions";
import { ObligationForm } from "@/components/bills/ObligationForm";
import { Amount } from "@/components/money/Amount";
import { formatShortDate } from "@/lib/date";
import { fromMinor } from "@/lib/money";
import { useUndo } from "@/components/ui/UndoToastProvider";

type Obligation = {
  obligation_id: string;
  title: string;
  due_on: string | null;
  amount_usd_minor: number;
  amount_paid_usd_minor: number;
  amount_remaining_usd_minor: number;
  status: string;
  is_past_due: boolean;
  days_until_due: number | null;
  source_note: string | null;
  waived_at: string | null;
};

export function ObligationDetail({ obligation }: { obligation: Obligation }) {
  const [editing, setEditing] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { scheduleUndo } = useUndo();

  const total = BigInt(obligation.amount_usd_minor);
  const remaining = BigInt(obligation.amount_remaining_usd_minor);
  const paidPct = total > 0n ? Number((BigInt(obligation.amount_paid_usd_minor) * 100n) / total) : 0;

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <ObligationForm
          mode="edit"
          initial={{
            id: obligation.obligation_id,
            title: obligation.title,
            due_on: obligation.due_on,
            amount_usd_minor: obligation.amount_usd_minor,
            source_note: obligation.source_note,
          }}
        />
        <button type="button" className="btn" onClick={() => setEditing(false)}>
          Done editing
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card row flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[18px] text-text font-medium">{obligation.title}</p>
            <p className="text-[13px] text-muted">
              {obligation.due_on ? `Due ${formatShortDate(obligation.due_on)}` : "No due date"}
            </p>
          </div>
          <span className="status-pill" data-status={obligation.is_past_due ? "past-due" : obligation.status}>
            {obligation.is_past_due ? "Past due" : obligation.status}
          </span>
        </div>

        <div className="progress-track">
          <div className="progress-fill" data-alarm={obligation.is_past_due} style={{ width: `${Math.min(paidPct, 100)}%` }} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="section-label">Paid</p>
            <Amount minor={BigInt(obligation.amount_paid_usd_minor)} className="text-text" />
          </div>
          <div>
            <p className="section-label">Remaining</p>
            <Amount
              minor={BigInt(obligation.amount_remaining_usd_minor)}
              className={obligation.is_past_due ? "text-alarm" : "text-text"}
            />
          </div>
          <div>
            <p className="section-label">Total</p>
            <Amount minor={total} className="text-text" />
          </div>
        </div>

        {obligation.source_note && <p className="text-[13px] text-faint">{obligation.source_note}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {/* Prefills the exact figure so the common case -- clearing what's
            left -- doesn't mean reading the number above and retyping it.
            Only offered when something is actually outstanding. */}
        {remaining > 0n && (
          <Link
            href={`/add?obligation_id=${obligation.obligation_id}&amount=${fromMinor(remaining)}`}
            className="btn btn-primary w-full"
          >
            Pay remaining <Amount minor={remaining} className="text-[inherit]" />
          </Link>
        )}
        <Link
          href={`/add?obligation_id=${obligation.obligation_id}`}
          className={remaining > 0n ? "btn w-full" : "btn btn-primary w-full"}
        >
          Record a different amount
        </Link>
      </div>

      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button
          type="button"
          className="btn flex-1"
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              const res = await duplicateObligation(obligation.obligation_id);
              if (res.error) setError(res.error);
              else if (res.newId) router.push(`/bills/${res.newId}`);
            })
          }
        >
          Duplicate
        </button>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn flex-1"
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              const res = await setObligationWaived(obligation.obligation_id, !obligation.waived_at);
              if (res.error) setError(res.error);
            })
          }
        >
          {obligation.waived_at ? "Un-waive" : "Waive"}
        </button>
        <button
          type="button"
          className="btn btn-destructive flex-1"
          disabled={busy}
          onClick={() => {
            scheduleUndo({
              label: "Bill deleted",
              onCommit: () => deleteObligation(obligation.obligation_id),
            });
            router.push("/bills");
          }}
        >
          Delete
        </button>
      </div>
      {error && <p className="text-alarm text-[14px]">{error}</p>}
    </div>
  );
}
