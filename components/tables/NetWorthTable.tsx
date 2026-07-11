"use client";

import { useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";
import { addNetWorthSnapshot, updateNetWorthSnapshot, deleteNetWorthSnapshot } from "@/app/(app)/net-worth/actions";

export type SnapshotRow = {
  id: string;
  snapshot_date: string;
  sofi_actual: number;
  ally_actual: number;
  cash_actual: number;
  total_actual: number;
  computed_balance: number;
  variance: number;
  notes: string | null;
};

function SnapshotForm({
  defaults,
  onSubmit,
  onCancel,
  pending,
}: {
  defaults?: Partial<SnapshotRow>;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
  pending: boolean;
}) {
  return (
    <form action={onSubmit} className="flex flex-wrap gap-2 items-end">
      <div>
        <label className="stat-label block mb-1 text-[10px]">Date</label>
        <input name="snapshot_date" type="date" defaultValue={defaults?.snapshot_date ?? ""} required className="input !py-1.5 !px-2 text-sm" />
      </div>
      <div className="w-24">
        <label className="stat-label block mb-1 text-[10px]">SoFi</label>
        <input name="sofi_actual" type="number" step="0.01" defaultValue={defaults?.sofi_actual ?? 0} className="input !py-1.5 !px-2 text-sm num" />
      </div>
      <div className="w-24">
        <label className="stat-label block mb-1 text-[10px]">Ally</label>
        <input name="ally_actual" type="number" step="0.01" defaultValue={defaults?.ally_actual ?? 0} className="input !py-1.5 !px-2 text-sm num" />
      </div>
      <div className="w-24">
        <label className="stat-label block mb-1 text-[10px]">Cash</label>
        <input name="cash_actual" type="number" step="0.01" defaultValue={defaults?.cash_actual ?? 0} className="input !py-1.5 !px-2 text-sm num" />
      </div>
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

export function NetWorthTable({ snapshots }: { snapshots: SnapshotRow[] }) {
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

  return (
    <Glass className="overflow-x-auto">
      <div className="flex items-center justify-between p-4 pb-0">
        <div className="font-display text-lg font-medium">Net Worth Snapshots</div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn text-sm">
            + Add Snapshot
          </button>
        )}
      </div>

      {adding && (
        <div className="p-4">
          <SnapshotForm onSubmit={handleAdd} onCancel={() => setAdding(false)} pending={pending} />
        </div>
      )}

      <table className="w-full text-sm min-w-[900px] mt-2">
        <thead>
          <tr className="text-text-dim text-left text-xs">
            <th className="py-3 px-2 font-normal">Date</th>
            <th className="py-3 px-2 font-normal text-right">SoFi</th>
            <th className="py-3 px-2 font-normal text-right">Ally</th>
            <th className="py-3 px-2 font-normal text-right">Cash</th>
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
              <td colSpan={9} className="py-10 text-center text-text-dim text-sm">
                No snapshots yet.
              </td>
            </tr>
          ) : (
            snapshots.map((s) =>
              editingId === s.id ? (
                <tr key={s.id} className="border-t border-[#241c14] bg-[rgba(201,162,75,0.035)]">
                  <td colSpan={9} className="py-3 px-2">
                    <SnapshotForm defaults={s} onSubmit={(fd) => handleUpdate(s.id, fd)} onCancel={() => setEditingId(null)} pending={pending} />
                  </td>
                </tr>
              ) : (
                <tr key={s.id} className="border-t border-[#241c14] hover:bg-[rgba(201,162,75,0.035)]">
                  <td className="py-2.5 px-2 num text-text-dim whitespace-nowrap">{s.snapshot_date}</td>
                  <td className="py-2.5 px-2 text-right num">{fmtUsd(s.sofi_actual)}</td>
                  <td className="py-2.5 px-2 text-right num">{fmtUsd(s.ally_actual)}</td>
                  <td className="py-2.5 px-2 text-right num">{fmtUsd(s.cash_actual)}</td>
                  <td className="py-2.5 px-2 text-right num text-brass font-medium">{fmtUsd(s.total_actual)}</td>
                  <td className="py-2.5 px-2 text-right num text-text-dim">{fmtUsd(s.computed_balance)}</td>
                  <td className="py-2.5 px-2 text-right num">
                    {s.variance === 0 ? "—" : `${s.variance > 0 ? "↑" : "↓"} ${fmtUsd(Math.abs(s.variance))}`}
                  </td>
                  <td className="py-2.5 px-2 text-text-dim text-xs">{s.notes ?? "—"}</td>
                  <td className="py-2.5 px-2 text-right whitespace-nowrap">
                    <button onClick={() => setEditingId(s.id)} className="text-text-dim hover:text-text text-xs mr-3">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="text-text-dim hover:text-text text-xs">
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
