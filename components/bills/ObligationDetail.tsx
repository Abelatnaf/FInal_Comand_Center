"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setObligationWaived, deleteObligation, duplicateObligation } from "@/app/(app)/bills/actions";
import { ObligationForm } from "@/components/bills/ObligationForm";
import { Amount } from "@/components/money/Amount";
import { formatShortDate } from "@/lib/date";

type Payer = { id: string; label: string };
type Obligation = {
  obligation_id: string;
  payer_id: string;
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

export function ObligationDetail({ obligation, payers, payerLabel }: { obligation: Obligation; payers: Payer[]; payerLabel: string }) {
  const [editing, setEditing] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const total = BigInt(obligation.amount_usd_minor);
  const paidPct = total > 0n ? Number((BigInt(obligation.amount_paid_usd_minor) * 100n) / total) : 0;

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <ObligationForm
          payers={payers}
          mode="edit"
          initial={{
            id: obligation.obligation_id,
            title: obligation.title,
            payer_id: obligation.payer_id,
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
              {payerLabel}
              {obligation.due_on && ` · due ${formatShortDate(obligation.due_on)}`}
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
            <Amount minor={BigInt(obligation.amount_paid_usd_minor)} currency="USD" className="text-text" />
          </div>
          <div>
            <p className="section-label">Remaining</p>
            <Amount
              minor={BigInt(obligation.amount_remaining_usd_minor)}
              currency="USD"
              className={obligation.is_past_due ? "text-alarm" : "text-text"}
            />
          </div>
          <div>
            <p className="section-label">Total</p>
            <Amount minor={total} currency="USD" className="text-text" />
          </div>
        </div>

        {obligation.source_note && <p className="text-[13px] text-faint">{obligation.source_note}</p>}
      </div>

      <Link
        href={`/add?obligation_id=${obligation.obligation_id}&payer_id=${obligation.payer_id}`}
        className="btn btn-primary w-full"
      >
        Record a payment
      </Link>

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
          onClick={() =>
            startTransition(async () => {
              const res = await deleteObligation(obligation.obligation_id);
              if (res.error) setError(res.error);
              else router.push("/bills");
            })
          }
        >
          Delete
        </button>
      </div>
      {error && <p className="text-alarm text-[14px]">{error}</p>}
    </div>
  );
}
