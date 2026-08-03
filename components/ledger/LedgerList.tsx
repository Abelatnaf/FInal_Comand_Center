"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionRow, type TransactionRowData } from "@/components/ledger/TransactionRow";
import { TransferRow, type TransferRowData } from "@/components/ledger/TransferRow";
import { bulkDeleteTransactions, bulkRecategorizeTransactions } from "@/app/(app)/ledger/actions";
import { kindForDirection, type Category } from "@/lib/categories";
import { useUndo } from "@/components/ui/UndoToastProvider";

type Account = { id: string; name: string };

export function LedgerList({
  rows,
  transfers,
  accounts,
  categories,
}: {
  rows: TransactionRowData[];
  transfers: TransferRowData[];
  accounts: Account[];
  categories: Category[];
}) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { scheduleUndo } = useUndo();

  // Transfers are interleaved for display only -- they carry no direction or
  // category, so they stay out of selection, totals and the summary.
  const timeline: (
    | { kind: "transaction"; row: TransactionRowData; date: string }
    | { kind: "transfer"; row: TransferRowData; date: string }
  )[] = [
    ...rows.map((row) => ({ kind: "transaction" as const, row, date: row.occurred_on })),
    ...transfers.map((row) => ({ kind: "transfer" as const, row, date: row.occurred_on })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const directions = new Set(selectedRows.map((r) => r.direction));
  const commonDirection = directions.size === 1 ? [...directions][0] : null;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelectionMode(false);
    setSelected(new Set());
    setError(null);
  }

  function handleBulkDelete() {
    const ids = [...selected];
    scheduleUndo({
      label: `${ids.length} ${ids.length === 1 ? "entry" : "entries"} deleted`,
      onCommit: async () => {
        const res = await bulkDeleteTransactions(ids);
        if (res.error) setError(res.error);
      },
    });
    exitSelection();
  }

  async function handleRecategorize(categoryId: string) {
    setBusy(true);
    const res = await bulkRecategorizeTransactions([...selected], categoryId);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    exitSelection();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {(rows.length > 0 || transfers.length > 0) && (
        <div className="flex justify-end">
          <button type="button" className="text-muted text-[13px]" onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}>
            {selectionMode ? "Cancel" : "Select"}
          </button>
        </div>
      )}

      {selectionMode && selected.size > 0 && (
        <div className="card row flex flex-col gap-3">
          <p className="text-[13px] text-muted">{selected.size} selected</p>
          {commonDirection ? (
            <div className="flex flex-wrap gap-2">
              {categories
                .filter((c) => c.kind === kindForDirection(commonDirection) && !c.is_archived)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={busy}
                    className="chip"
                    onClick={() => handleRecategorize(c.id)}
                  >
                    <span aria-hidden>{c.icon}</span>
                    {c.name}
                  </button>
                ))}
            </div>
          ) : (
            <p className="text-[12px] text-faint">Mixed in/out selected — pick entries of one direction to bulk recategorize.</p>
          )}
          <button type="button" className="btn btn-destructive" onClick={handleBulkDelete}>
            Delete selected
          </button>
          {error && <p className="text-alarm text-[13px]">{error}</p>}
        </div>
      )}

      <div className="card">
        {timeline.length === 0 && <p className="row text-[14px] text-muted">Nothing matches these filters.</p>}
        {timeline.map((item) =>
          item.kind === "transaction" ? (
            <TransactionRow
              key={`t-${item.row.id}`}
              transaction={item.row}
              accounts={accounts}
              categories={categories}
              selectionMode={selectionMode}
              selected={selected.has(item.row.id)}
              onToggleSelect={toggle}
            />
          ) : (
            <TransferRow key={`x-${item.row.id}`} transfer={item.row} />
          )
        )}
      </div>
    </div>
  );
}
