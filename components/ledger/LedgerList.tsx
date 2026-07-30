"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TransactionRow, type TransactionRowData } from "@/components/ledger/TransactionRow";
import { bulkDeleteTransactions, bulkRecategorizeTransactions } from "@/app/(app)/ledger/actions";
import { categoriesFor } from "@/lib/categories";
import { useUndo } from "@/components/ui/UndoToastProvider";
import type { Currency } from "@/lib/money";

type Payer = { id: string; label: string };
type Account = { id: string; name: string; currency: Currency };

export function LedgerList({ rows, payers, accounts }: { rows: TransactionRowData[]; payers: Payer[]; accounts: Account[] }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { scheduleUndo } = useUndo();

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

  async function handleRecategorize(category: string) {
    setBusy(true);
    const res = await bulkRecategorizeTransactions([...selected], category);
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
      {rows.length > 0 && (
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
              {categoriesFor(commonDirection).map((c) => (
                <button key={c} type="button" disabled={busy} className="chip" onClick={() => handleRecategorize(c)}>
                  {c}
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
        {rows.length === 0 && <p className="row text-[14px] text-muted">Nothing matches these filters.</p>}
        {rows.map((t) => (
          <TransactionRow
            key={t.id}
            transaction={t}
            payers={payers}
            accounts={accounts}
            selectionMode={selectionMode}
            selected={selected.has(t.id)}
            onToggleSelect={toggle}
          />
        ))}
      </div>
    </div>
  );
}
