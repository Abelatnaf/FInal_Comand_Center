"use client";

import { useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { addKeyDate, updateKeyDate, deleteKeyDate } from "@/app/(app)/key-dates/actions";

export type KeyDateRow = {
  id: number;
  event: string;
  window_label: string;
  status: string;
  budget_note: string | null;
};

function KeyDateForm({
  defaults,
  onSubmit,
  onCancel,
  pending,
}: {
  defaults?: Partial<KeyDateRow>;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
  pending: boolean;
}) {
  return (
    <form action={onSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[160px]">
        <label className="stat-label block mb-1 text-[10px]">Event</label>
        <input name="event" defaultValue={defaults?.event ?? ""} required className="input !py-1.5 !px-2 text-sm w-full" />
      </div>
      <div className="flex-1 min-w-[140px]">
        <label className="stat-label block mb-1 text-[10px]">Window</label>
        <input name="window_label" defaultValue={defaults?.window_label ?? ""} required className="input !py-1.5 !px-2 text-sm w-full" />
      </div>
      <div className="w-40">
        <label className="stat-label block mb-1 text-[10px]">Status</label>
        <input name="status" defaultValue={defaults?.status ?? "Estimated"} required className="input !py-1.5 !px-2 text-sm w-full" />
      </div>
      <div className="flex-1 min-w-[200px]">
        <label className="stat-label block mb-1 text-[10px]">Budget Note</label>
        <input name="budget_note" defaultValue={defaults?.budget_note ?? ""} className="input !py-1.5 !px-2 text-sm w-full" />
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

export function KeyDatesTable({ keyDates }: { keyDates: KeyDateRow[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const res = await addKeyDate(formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setAdding(false);
      }
    });
  }

  function handleUpdate(id: number, formData: FormData) {
    startTransition(async () => {
      const res = await updateKeyDate(id, formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setEditingId(null);
      }
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this key date?")) return;
    startTransition(async () => {
      const res = await deleteKeyDate(id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <Glass className="overflow-x-auto">
      <div className="flex items-center justify-between p-4 pb-0">
        <div className="font-display text-lg font-medium">Key Dates</div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn text-sm">
            + Add Date
          </button>
        )}
      </div>

      {adding && (
        <div className="p-4">
          <KeyDateForm onSubmit={handleAdd} onCancel={() => setAdding(false)} pending={pending} />
        </div>
      )}

      <table className="w-full text-sm min-w-[900px] mt-2">
        <thead>
          <tr className="text-text-faint text-left text-xs">
            <th className="py-3 px-2 font-normal">Event</th>
            <th className="py-3 px-2 font-normal">Window</th>
            <th className="py-3 px-2 font-normal">Status</th>
            <th className="py-3 px-2 font-normal">Budget Note</th>
            <th className="py-3 px-2 font-normal text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {keyDates.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-10 text-center text-text-faint text-sm">
                No key dates yet.
              </td>
            </tr>
          ) : (
            keyDates.map((k) =>
              editingId === k.id ? (
                <tr key={k.id} className="border-t border-white/[0.05] bg-white/[0.02]">
                  <td colSpan={5} className="py-3 px-2">
                    <KeyDateForm defaults={k} onSubmit={(fd) => handleUpdate(k.id, fd)} onCancel={() => setEditingId(null)} pending={pending} />
                  </td>
                </tr>
              ) : (
                <tr key={k.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="py-2.5 px-2 text-text-dim">{k.event}</td>
                  <td className="py-2.5 px-2 text-text-faint whitespace-nowrap">{k.window_label}</td>
                  <td className="py-2.5 px-2 text-text-faint text-xs">{k.status}</td>
                  <td className="py-2.5 px-2 text-text-faint text-xs">{k.budget_note ?? "—"}</td>
                  <td className="py-2.5 px-2 text-right whitespace-nowrap">
                    <button onClick={() => setEditingId(k.id)} className="text-text-dim hover:text-text text-xs mr-3">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(k.id)} className="text-text-faint hover:text-text-dim text-xs">
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
