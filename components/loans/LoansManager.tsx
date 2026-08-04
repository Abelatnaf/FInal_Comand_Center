"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addLoan, deleteLoan, type LoanState } from "@/app/(app)/loans/actions";
import { Amount } from "@/components/money/Amount";
import { formatShortDate, todayIso } from "@/lib/date";

export type LoanRow = {
  id: string;
  name: string;
  servicer: string | null;
  principal_minor: number;
  interest_rate_bp: number;
  is_subsidized: boolean;
  disbursed_on: string;
  term_name: string | null;
};

export type LoanSummary = {
  principal_minor: number;
  accrued_interest_minor: number;
  balance_minor: number;
  avg_rate_percent: number | null;
  est_monthly_payment_minor: number | null;
} | null;

type Term = { id: string; name: string };

export function LoansManager({
  loans,
  summary,
  terms,
}: {
  loans: LoanRow[];
  summary: LoanSummary;
  terms: Term[];
}) {
  const [adding, setAdding] = useState(loans.length === 0);
  const [state, formAction, pending] = useActionState<LoanState, FormData>(addLoan, undefined);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setAdding(false);
  }, [state]);

  return (
    <div className="flex flex-col gap-5">
      {summary && (
        <div className="card card-hero row">
          <p className="section-label mb-2">Borrowed so far</p>
          <Amount minor={BigInt(summary.balance_minor)} className="hero-figure block" />
          {summary.accrued_interest_minor > 0 && (
            <p className="text-[14px] text-muted mt-1">
              <Amount minor={BigInt(summary.principal_minor)} /> borrowed +{" "}
              <Amount minor={BigInt(summary.accrued_interest_minor)} className="text-alarm" /> interest so
              far
            </p>
          )}
          <div className="flex gap-6 mt-4 pt-4 border-t">
            {summary.avg_rate_percent !== null && (
              <div>
                <p className="section-label">Average rate</p>
                <p className="text-[17px] font-semibold num">{summary.avg_rate_percent}%</p>
              </div>
            )}
            {summary.est_monthly_payment_minor !== null && (
              <div>
                <p className="section-label">Est. payment</p>
                <Amount
                  minor={BigInt(summary.est_monthly_payment_minor)}
                  className="text-[17px] font-semibold"
                />
                <p className="text-[12px] text-faint">a month, 10 yrs</p>
              </div>
            )}
          </div>
          <p className="text-[12px] text-faint mt-3">
            An estimate on a standard 10-year plan at your average rate. Your real terms come from your
            servicer — and subsidized loans don&rsquo;t accrue interest while you&rsquo;re enrolled, so
            they&rsquo;re counted at face value here.
          </p>
        </div>
      )}

      <div className="card">
        {loans.map((l) => (
          <div key={l.id} className="row flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] text-text truncate">{l.name}</p>
              <p className="text-[13px] text-muted truncate">
                {(l.interest_rate_bp / 100).toFixed(2)}% ·{" "}
                {l.is_subsidized ? "subsidized" : "unsubsidized"}
                {l.term_name ? ` · ${l.term_name}` : ""} · {formatShortDate(l.disbursed_on)}
                {l.servicer ? ` · ${l.servicer}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Amount minor={BigInt(l.principal_minor)} />
              <button
                type="button"
                className="text-alarm text-[13px]"
                disabled={busy}
                onClick={() =>
                  startTransition(async () => {
                    await deleteLoan(l.id);
                    router.refresh();
                  })
                }
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {loans.length === 0 && !adding && (
          <p className="row text-[14px] text-muted">No loans recorded.</p>
        )}

        <div className="row flex items-center justify-between">
          <p className="section-label">Add a loan</p>
          {!adding && (
            <button type="button" className="text-accent text-[13px]" onClick={() => setAdding(true)}>
              Add
            </button>
          )}
        </div>

        {adding && (
          <form action={formAction} className="row flex flex-col gap-2">
            <input name="name" placeholder="Unsubsidized Stafford" className="input" required />
            <input name="servicer" placeholder="Servicer (optional)" className="input" />
            <div className="flex gap-2">
              <input
                name="principal"
                inputMode="decimal"
                placeholder="Amount, e.g. 5500"
                className="input num"
                required
              />
              <input name="interest_rate" inputMode="decimal" placeholder="Rate %" className="input num" />
            </div>
            <label className="section-label">Disbursed</label>
            <input name="disbursed_on" type="date" defaultValue={todayIso()} className="input" required />
            {terms.length > 0 && (
              <select name="term_id" className="input" aria-label="Term" defaultValue="">
                <option value="">Not tied to a term</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <label className="flex items-center gap-2.5 text-[15px] text-text">
              <input type="checkbox" name="is_subsidized" value="true" />
              Subsidized
            </label>
            <p className="text-[12px] text-faint">
              Subsidized loans don&rsquo;t build interest while you&rsquo;re in school, so ticking this
              keeps the estimate honest.
            </p>
            {state?.error && <p className="text-alarm text-[13px]">{state.error}</p>}
            <div className="flex gap-2">
              {loans.length > 0 && (
                <button type="button" className="btn flex-1" onClick={() => setAdding(false)}>
                  Cancel
                </button>
              )}
              <button type="submit" disabled={pending} className="btn btn-primary flex-1">
                {pending ? "Saving…" : "Save loan"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
