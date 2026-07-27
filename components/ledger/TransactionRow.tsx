"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { updateTransaction, deleteTransaction, type TransactionFormState } from "@/app/(app)/ledger/actions";
import { Amount } from "@/components/money/Amount";
import { CurrencyToggle } from "@/components/money/CurrencyToggle";
import { formatRelativeDay } from "@/lib/date";
import { categoriesFor, type Direction } from "@/lib/categories";
import type { Currency } from "@/lib/money";

export type TransactionRowData = {
  id: string;
  occurred_on: string;
  direction: Direction;
  amount_minor: number;
  currency: Currency;
  amount_usd_minor: number;
  category: string | null;
  note: string | null;
  account_id: string;
  account_name: string;
  payer_id: string;
  payer_label: string;
  obligation_id: string | null;
  week_number?: number | null;
};

type Payer = { id: string; label: string };
type Account = { id: string; name: string; currency: Currency };

export function TransactionRow({
  transaction,
  payers,
  accounts,
}: {
  transaction: TransactionRowData;
  payers: Payer[];
  accounts: Account[];
}) {
  const [editing, setEditing] = useState(false);
  const [currency, setCurrency] = useState<Currency>(transaction.currency);
  const [direction, setDirection] = useState<Direction>(transaction.direction);
  const [pendingDelete, startDeleteTransition] = useTransition();

  const [state, formAction, pending] = useActionState<TransactionFormState, FormData>(updateTransaction, undefined);

  // Closing the edit view on a successful save is an external-sync response
  // to the action's result, not a render-time computation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setEditing(false);
  }, [state]);

  if (!editing) {
    const isOut = transaction.direction === "out";
    return (
      <button type="button" onClick={() => setEditing(true)} className="row w-full text-left flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] text-text truncate">{transaction.category ?? "Uncategorized"}</p>
          <p className="text-[13px] text-muted">
            {formatRelativeDay(transaction.occurred_on)} · {transaction.account_name} · {transaction.payer_label}
            {transaction.week_number != null && ` · Week ${transaction.week_number}`}
          </p>
        </div>
        <Amount
          minor={BigInt(isOut ? -transaction.amount_minor : transaction.amount_minor)}
          currency={transaction.currency}
          className={`shrink-0 ${isOut ? "text-text" : "text-positive"}`}
        />
      </button>
    );
  }

  const accountsForCurrency = accounts.filter((a) => a.currency === currency);

  return (
    <form action={formAction} className="row flex flex-col gap-3">
      <input type="hidden" name="id" value={transaction.id} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="direction" value={direction} />

      <div className="flex items-center justify-between gap-3">
        <CurrencyToggle value={currency} onChange={setCurrency} />
        <div className="segmented" role="group" aria-label="Direction">
          <button type="button" data-active={direction === "out"} onClick={() => setDirection("out")}>
            Out
          </button>
          <button type="button" data-active={direction === "in"} onClick={() => setDirection("in")}>
            In
          </button>
        </div>
      </div>

      <input
        name="amount_minor"
        type="number"
        step="1"
        min="1"
        defaultValue={transaction.amount_minor}
        className="input num"
        aria-label="Amount (minor units)"
      />

      <div className="flex flex-wrap gap-2">
        {categoriesFor(direction).map((c) => (
          <label key={c} className="chip" data-active={c === transaction.category}>
            <input type="radio" name="category" value={c} defaultChecked={c === transaction.category} className="sr-only" />
            {c}
          </label>
        ))}
      </div>

      <input name="occurred_on" type="date" defaultValue={transaction.occurred_on} className="input" />

      <select name="account_id" defaultValue={transaction.account_id} className="input">
        {accountsForCurrency.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      <select name="payer_id" defaultValue={transaction.payer_id} className="input">
        {payers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <input name="note" defaultValue={transaction.note ?? ""} placeholder="Note" className="input" />
      <input type="hidden" name="obligation_id" value={transaction.obligation_id ?? ""} />

      {state?.error && <p className="text-alarm text-[14px]">{state.error}</p>}

      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={() => setEditing(false)}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-destructive"
          disabled={pendingDelete}
          onClick={() => startDeleteTransition(async () => { await deleteTransaction(transaction.id); })}
        >
          {pendingDelete ? "Deleting…" : "Delete"}
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary flex-1">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
