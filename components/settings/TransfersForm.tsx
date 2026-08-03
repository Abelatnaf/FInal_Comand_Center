"use client";

import { useActionState, useEffect, useState } from "react";
import { createTransfer, updateTransfer, deleteTransfer } from "@/app/(app)/settings/transfer-actions";
import { Amount } from "@/components/money/Amount";
import { formatShortDate, todayIso } from "@/lib/date";
import { fromMinor } from "@/lib/money";
import { useUndo } from "@/components/ui/UndoToastProvider";

type Account = { id: string; name: string };
export type TransferRow = {
  id: string;
  occurred_on: string;
  amount_minor: number;
  note: string | null;
  from_account_id: string;
  to_account_id: string;
};

export function TransfersForm({ accounts, transfers }: { accounts: Account[]; transfers: TransferRow[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<TransferState, FormData>(createTransfer, undefined);
  const { scheduleUndo } = useUndo();
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setAdding(false);
  }, [state]);

  const accountById = (id: string) => accounts.find((a) => a.id === id);

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
            Moving money between your own accounts — including a credit card payment. Never counted as
            income or spending.
          </p>
        </div>
        {!adding && (
          <button type="button" className="text-accent text-[13px] shrink-0" onClick={() => setAdding(true)}>
            Add
          </button>
        )}
      </div>

      {adding && (
        <form action={formAction} className="row flex flex-col gap-3">
          <div className="flex gap-2">
            <select name="from_account_id" defaultValue={accounts[0]?.id} className="input" aria-label="From account">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  From: {a.name}
                </option>
              ))}
            </select>
            <select name="to_account_id" defaultValue={accounts[1]?.id} className="input" aria-label="To account">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  To: {a.name}
                </option>
              ))}
            </select>
          </div>

          <input name="amount" inputMode="decimal" placeholder="Amount" className="input num" aria-label="Amount" />
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

      {visible.length === 0 && !adding && <p className="row text-[14px] text-muted">No transfers yet.</p>}

      {visible.map((t) => {
        const from = accountById(t.from_account_id);
        const to = accountById(t.to_account_id);
        if (editingId === t.id) {
          return (
            <TransferEditRow key={t.id} transfer={t} accounts={accounts} onDone={() => setEditingId(null)} />
          );
        }
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
              <Amount minor={BigInt(t.amount_minor)} className="text-text" />
              <button type="button" className="text-accent text-[13px]" onClick={() => setEditingId(t.id)}>
                Edit
              </button>
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

function TransferEditRow({
  transfer,
  accounts,
  onDone,
}: {
  transfer: TransferRow;
  accounts: Account[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState<TransferState, FormData>(updateTransfer, undefined);

  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="row flex flex-col gap-2">
      <input type="hidden" name="id" value={transfer.id} />
      <div className="flex gap-2">
        <select
          name="from_account_id"
          defaultValue={transfer.from_account_id}
          className="input"
          aria-label="From account"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              From: {a.name}
            </option>
          ))}
        </select>
        <select
          name="to_account_id"
          defaultValue={transfer.to_account_id}
          className="input"
          aria-label="To account"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              To: {a.name}
            </option>
          ))}
        </select>
      </div>
      <input
        name="amount"
        inputMode="decimal"
        defaultValue={fromMinor(BigInt(transfer.amount_minor))}
        className="input num"
        aria-label="Amount"
      />
      <input name="occurred_on" type="date" defaultValue={transfer.occurred_on} className="input" aria-label="Date" />
      <input name="note" defaultValue={transfer.note ?? ""} placeholder="Note (optional)" className="input" />
      {state?.error && <p className="text-alarm text-[13px]">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary flex-1">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
