"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { updateTransaction, deleteTransaction, attachReceipt, type TransactionFormState } from "@/app/(app)/ledger/actions";
import { ReceiptLink } from "@/components/money/ReceiptLink";
import { Amount } from "@/components/money/Amount";
import { formatRelativeDay } from "@/lib/date";
import { kindForDirection, colorVar, type Category, type Direction } from "@/lib/categories";
import { useUndo } from "@/components/ui/UndoToastProvider";

export type TransactionRowData = {
  id: string;
  occurred_on: string;
  direction: Direction;
  amount_minor: number;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  note: string | null;
  account_id: string;
  account_name: string;
  obligation_id: string | null;
  tags?: string[] | null;
  week_number?: number | null;
  receipt_path?: string | null;
};

type Account = { id: string; name: string };

export function TransactionRow({
  transaction,
  accounts,
  categories,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: {
  transaction: TransactionRowData;
  accounts: Account[];
  categories: Category[];
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [direction, setDirection] = useState<Direction>(transaction.direction);
  const [pendingRemoval, setPendingRemoval] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const { scheduleUndo } = useUndo();

  const [state, formAction, pending] = useActionState<TransactionFormState, FormData>(updateTransaction, undefined);

  // Closing the edit view on a successful save is an external-sync response
  // to the action's result, not a render-time computation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setEditing(false);
  }, [state]);

  function handleDelete() {
    setPendingRemoval(true);
    scheduleUndo({
      label: "Entry deleted",
      onCommit: () => deleteTransaction(transaction.id),
      onUndo: () => setPendingRemoval(false),
    });
  }

  if (pendingRemoval) return null;

  if (!editing) {
    const isOut = transaction.direction === "out";
    return (
      <button
        type="button"
        onClick={() => (selectionMode ? onToggleSelect?.(transaction.id) : setEditing(true))}
        className="row w-full text-left flex items-center justify-between gap-3"
      >
        {selectionMode && (
          <input
            type="checkbox"
            checked={selected}
            readOnly
            className="w-[18px] h-[18px] shrink-0 accent-[var(--accent)]"
            aria-label="Select entry"
          />
        )}
        <div
          className="cat-icon"
          style={{ ["--cat-color" as string]: colorVar(transaction.category_color) }}
          aria-hidden
        >
          {transaction.category_icon ?? "•"}
        </div>
        <div className="min-w-0 flex-1">
          {/* The note is what identifies a purchase ("Shell", "weekly shop");
              the category is how it's grouped. Lead with whichever is there. */}
          <p className="text-[15px] font-medium truncate">
            {transaction.note?.trim() || transaction.category_name || "Uncategorized"}
          </p>
          <p className="text-[13px] text-muted truncate">
            {transaction.note?.trim() && transaction.category_name ? `${transaction.category_name} · ` : ""}
            {formatRelativeDay(transaction.occurred_on)} · {transaction.account_name}
            {transaction.tags?.length ? ` · ${transaction.tags.map((t) => `#${t}`).join(" ")}` : ""}
          </p>
        </div>
        <Amount
          minor={BigInt(isOut ? -transaction.amount_minor : transaction.amount_minor)}
          className={`shrink-0 ${isOut ? "text-text" : "text-positive"}`}
        />
      </button>
    );
  }

  return (
    <form action={formAction} className="row flex flex-col gap-3">
      <input type="hidden" name="id" value={transaction.id} />
      <input type="hidden" name="direction" value={direction} />

      <div className="segmented" role="group" aria-label="Direction">
        <button type="button" data-active={direction === "out"} onClick={() => setDirection("out")}>
          Spent
        </button>
        <button type="button" data-active={direction === "in"} onClick={() => setDirection("in")}>
          Received
        </button>
      </div>

      <input
        name="amount_minor"
        type="number"
        step="1"
        min="1"
        defaultValue={transaction.amount_minor}
        className="input num"
        aria-label="Amount in cents"
      />

      <div className="flex flex-wrap gap-2">
        {categories
          .filter((c) => c.kind === kindForDirection(direction) && !c.is_archived)
          .map((c) => (
            <label key={c.id} className="chip" data-active={c.id === transaction.category_id}>
              <input
                type="radio"
                name="category_id"
                value={c.id}
                defaultChecked={c.id === transaction.category_id}
                className="sr-only"
              />
              <span aria-hidden>{c.icon}</span>
              {c.name}
            </label>
          ))}
      </div>

      <input name="occurred_on" type="date" defaultValue={transaction.occurred_on} className="input" />

      <select name="account_id" defaultValue={transaction.account_id} className="input">
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>

      <input name="note" defaultValue={transaction.note ?? ""} placeholder="Description" className="input" />
      <input
        name="tags"
        defaultValue={(transaction.tags ?? []).join(", ")}
        placeholder="Tags, comma separated"
        className="input"
      />
      <input type="hidden" name="obligation_id" value={transaction.obligation_id ?? ""} />

      {/* Receipt upload is its own action, not part of this form's submit --
          the edit form goes through useActionState with a Zod schema that has
          no file field, and a file input would be silently dropped by it. */}
      <div className="flex items-center gap-3 flex-wrap">
        {transaction.receipt_path && <ReceiptLink path={transaction.receipt_path} />}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="input flex-1 min-w-[140px]"
          aria-label={transaction.receipt_path ? "Replace receipt" : "Attach receipt"}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.set("receipt", file);
            setReceiptBusy(true);
            const res = await attachReceipt(transaction.id, fd);
            setReceiptBusy(false);
            setReceiptError(res.error ?? null);
          }}
        />
        {receiptBusy && <span className="text-muted text-[13px]">Uploading…</span>}
      </div>
      {receiptError && <p className="text-alarm text-[13px]">{receiptError}</p>}

      {state?.error && <p className="text-alarm text-[14px]">{state.error}</p>}

      {/* The collapsed row is a button, so a link into the category can't live
          there without nesting interactive elements. It goes here instead. */}
      {transaction.category_id && transaction.category_name && (
        <Link
          href={`/categories/${transaction.category_id}`}
          className="text-[13px] text-accent font-semibold"
        >
          All {transaction.category_name} →
        </Link>
      )}

      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={() => setEditing(false)}>
          Cancel
        </button>
        <button type="button" className="btn btn-destructive" onClick={handleDelete}>
          Delete
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary flex-1">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
