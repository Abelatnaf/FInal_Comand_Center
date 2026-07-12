"use client";

import { useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";
import { DatePicker } from "@/components/ui/DatePicker";
import { addNetWorthSnapshot, updateNetWorthSnapshot, deleteNetWorthSnapshot } from "@/app/(app)/net-worth/actions";

type Account = { id: string; name: string };

export type SnapshotRow = {
  id: string;
  snapshot_date: string;
  balances: Record<string, number>;
  total_actual: number;
  computed_balance: number;
  variance: number;
  notes: string | null;
};

function SnapshotForm({
  accounts,
  defaults,
  onSubmit,
  onCancel,
  pending,
}: {
  accounts: Account[];
  defaults?: Partial<SnapshotRow>;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
  pending: boolean;
}) {
  return (
    <form action={onSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="w-36">
        <label className="stat-label block mb-1 text-[10px]">Date</label>
        <DatePicker name="snapshot_date" defaultValue={defaults?.snapshot_date ?? ""} required className="!py-1.5 !px-2 text-sm" />
      </div>
      {accounts.map((a) => (
        <div key={a.id} className="w-24">
          <label className="stat-label block mb-1 text-[10px] truncate" title={a.name}>
            {a.name}
          </label>
          <input
            name={`account_${a.id}`}
            type="number"
            step="0.01"
            defaultValue={defaults?.balances?.[a.id] ?? 0}
            className="input !py-1.5 !px-2 text-sm num"
          />
        </div>
      ))}
      <div className="flex-1 min-w-[140px]">
        <label className="stat-label block mb-1 text-[10px]">Notes</label>
        <input name="notes" defaultValue={defaults?.notes ?? ""} className="input !py-1.5 !px-2 text-sm w-full" />
      </div>
      <div className="flex gap-1.5">
        <button type="submit" disabled={pending} className="btn btn-primary !py-1.5 !px-3 text-xs">
          {pending ? "Saving…" : "Save"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn !py-1.5 !px-3 text-xs">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function NetWorthTable({ snapshots, accounts }: { snapshots: SnapshotRow[]; accounts: Account[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const res = await addNetWorthSnapshot(formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setAdding(false);
      }
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      const res = await updateNetWorthSnapshot(id, formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setEditingId(null);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this snapshot?")) return;
    startTransition(async () => {
      const res = await deleteNetWorthSnapshot(id);
      if (res?.error) setError(res.error);
    });
  }

  const colCount = 5 + accounts.length;

  return (
    <Glass className="overflow-x-auto">
      <div className="flex items-center justify-between p-4 pb-0">
        <div className="ios-headline">Net Worth Snapshots</div>
        {!adding && accounts.length > 0 && (
          <button onClick={() => setAdding(true)} className="btn text-sm">
            + Add Snapshot
          </button>
        )}
      </div>

      {accounts.length === 0 && (
        <p className="text-text-dim text-sm p-4">Add an account in Settings → Financial before logging a snapshot.</p>
      )}

      {adding && (
        <div className="p-4">
          <SnapshotForm accounts={accounts} onSubmit={handleAdd} onCancel={() => setAdding(false)} pending={pending} />
        </div>
      )}

      <table className="w-full text-sm min-w-[900px] mt-2">
        <thead>
          <tr className="text-text-dim text-left text-xs">
            <th className="py-3 px-2 font-normal">Date</th>
            {accounts.map((a) => (
              <th key={a.id} className="py-3 px-2 font-normal text-right">
                {a.name}
              </th>
            ))}
            <th className="py-3 px-2 font-normal text-right">Total Actual</th>
            <th className="py-3 px-2 font-normal text-right">Computed</th>
            <th className="py-3 px-2 font-normal text-right">Variance</th>
            <th className="py-3 px-2 font-normal">Notes</th>
            <th className="py-3 px-2 font-normal text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="py-10 text-center text-text-dim text-sm">
                No snapshots yet.
              </td>
            </tr>
          ) : (
            snapshots.map((s) =>
              editingId === s.id ? (
                <tr key={s.id} className="border-t border-[var(--separator)] bg-[rgba(0,0,0,0.03)]">
                  <td colSpan={colCount} className="py-3 px-2">
                    <SnapshotForm
                      accounts={accounts}
                      defaults={s}
                      onSubmit={(fd) => handleUpdate(s.id, fd)}
                      onCancel={() => setEditingId(null)}
                      pending={pending}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-t border-[var(--separator)] hover:bg-[rgba(0,0,0,0.03)]">
                  <td className="py-2.5 px-2 num text-text-dim whitespace-nowrap">{s.snapshot_date}</td>
                  {accounts.map((a) => (
                    <td key={a.id} className="py-2.5 px-2 text-right num">
                      {fmtUsd(s.balances[a.id] ?? 0)}
                    </td>
                  ))}
                  <td className="py-2.5 px-2 text-right num text-text font-semibold">{fmtUsd(s.total_actual)}</td>
                  <td className="py-2.5 px-2 text-right num text-text-dim">{fmtUsd(s.computed_balance)}</td>
                  <td className="py-2.5 px-2 text-right num">
                    {s.variance === 0 ? "—" : `${s.variance > 0 ? "↑" : "↓"} ${fmtUsd(Math.abs(s.variance))}`}
                  </td>
                  <td className="py-2.5 px-2 text-text-dim text-xs">{s.notes ?? "—"}</td>
                  <td className="py-2.5 px-2 text-right whitespace-nowrap">
                    <button onClick={() => setEditingId(s.id)} className="link-action text-[13px] mr-4">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="link-destructive text-[13px]">
                      Delete
                    </button>
                  </td>
                </tr>
              )
            )
          )}
        </tbody>
      </table>
      {error && <p className="text-text-dim text-xs p-4">{error}</p>}
    </Glass>
  );
}
