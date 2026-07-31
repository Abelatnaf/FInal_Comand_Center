"use client";

import { useActionState, useEffect, useState } from "react";
import { createTransfer, deleteTransfer } from "@/app/(app)/settings/transfer-actions";
import { Amount } from "@/components/money/Amount";
import { formatShortDate, todayIso } from "@/lib/date";
import { useUndo } from "@/components/ui/UndoToastProvider";
import type { Currency } from "@/lib/money";

type Account = { id: string; name: string; currency: Currency };
export type TransferRow = {
  id: string;
  occurred_on: string;
  from_amount_minor: number;
  to_amount_minor: number;
  note: string | null;
  from_account_id: string;
  to_account_id: string;
};

export function TransfersForm({ accounts, transfers }: { accounts: Account[]; transfers: TransferRow[] }) {
  const [adding, setAdding] = useState(false);
  const [state, formAction, pending] = useActionState<TransferState, FormData>(createTransfer, undefined);
  const { scheduleUndo } = useUndo();
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState(accounts[1]?.id ?? "");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setAdding(false);
  }, [state]);

  const accountById = (id: string) => accounts.find((a) => a.id === id);
  const fromAccount = accountById(fromId);
  const toAccount = accountById(toId);
  const crossCurrency = fromAccount && toAccount && fromAccount.currency !== toAccount.currency;

  function handleDelete(id: string) {
    setRemoved((prev) => new Set(prev).add(id));
    scheduleUndo({
      label: "Transfer deleted",
      onCommit: () => deleteTransfer(id),
      onUndo: () =>
        setRemoved((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }),
    });
  }

  const visible = transfers.filter((t) => !removed.has(t.id));

  return (
    <div className="card">
      <div className="row flex items-center justify-between gap-3">
        <div>
          <p className="section-label mb-1">Transfers</p>
          <p className="text-[13px] text-muted">
            Moving money between your own accounts. Never counted as income or spending.
          </p>
        </div>
        {!adding && (
          <button type="button" className="text-silver text-[13px] shrink-0" onClick={() => setAdding(true)}>
            Add
          </button>
        )}
      </div>

      {adding && (
        <form action={formAction} className="row flex flex-col gap-3">
          <div className="flex gap-2">
            <select
              name="from_account_id"
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="input"
              aria-label="From account"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  From: {a.name} ({a.currency})
                </option>
              ))}
            </select>
            <select
              name="to_account_id"
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="input"
              aria-label="To account"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  To: {a.name} ({a.currency})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <input
              name="from_amount"
              inputMode="decimal"
              placeholder={`Sent${fromAccount ? ` (${fromAccount.currency})` : ""}`}
              className="input num"
              aria-label="Amount sent"
            />
            <input
              name="to_amount"
              inputMode="decimal"
              placeholder={`Received${toAccount ? ` (${toAccount.currency})` : ""}`}
              className="input num"
              aria-label="Amount received"
            />
          </div>

          {/* Both figures are asked for on purpose. Deriving one from a rate
              would invent a number; this way the record is what actually
              landed, and a spread or fee simply shows up as the difference. */}
          <p className="text-[12px] text-faint">
            {crossCurrency
              ? "Different currencies — enter what actually left and what actually arrived, so any spread or fee is recorded rather than guessed."
              : "Usually the same figure both sides; they can differ if a fee was taken."}
          </p>

          <input name="occurred_on" type="date" defaultValue={todayIso()} className="input" aria-label="Date" />
          <input name="note" placeholder="Note (optional)" className="input" />

          {state?.error && <p className="text-alarm text-[13px]">{state.error}</p>}

          <div className="flex gap-2">
            <button type="button" className="btn flex-1" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn btn-primary flex-1">
              {pending ? "Saving…" : "Save transfer"}
            </button>
          </div>
        </form>
      )}

      {visible.length === 0 && !adding && (
        <p className="row text-[14px] text-muted">No transfers yet.</p>
      )}

      {visible.map((t) => {
        const from = accountById(t.from_account_id);
        const to = accountById(t.to_account_id);
        return (
          <div key={t.id} className="row flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] text-text truncate">
                {from?.name ?? "—"} → {to?.name ?? "—"}
              </p>
              <p className="text-[13px] text-muted">
                {formatShortDate(t.occurred_on)}
                {t.note && ` · ${t.note}`}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <Amount
                  minor={BigInt(t.from_amount_minor)}
                  currency={from?.currency ?? "USD"}
                  className="text-text block"
                />
                {from?.currency !== to?.currency && (
                  <Amount
                    minor={BigInt(t.to_amount_minor)}
                    currency={to?.currency ?? "USD"}
                    className="text-muted text-[13px] block"
                  />
                )}
              </div>
              <button type="button" className="text-alarm text-[13px]" onClick={() => handleDelete(t.id)}>
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type TransferState = { error?: string; success?: boolean } | undefined;
