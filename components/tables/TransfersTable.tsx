"use client";

import { useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { HScroll } from "@/components/ui/HScroll";
import { fmtUsd } from "@/lib/format";
import { DatePicker } from "@/components/ui/DatePicker";
import { addTransfer } from "@/app/(app)/quick-add-actions";
import { updateTransfer, deleteTransfer } from "@/app/(app)/transfers/actions";

type Account = { id: string; name: string };

export type TransferRow = {
  id: string;
  date: string;
  from_account_id: string;
  to_account_id: string;
  amount_usd: number;
  notes: string | null;
};

function TransferForm({
  accounts,
  defaults,
  onSubmit,
  onCancel,
  pending,
}: {
  accounts: Account[];
  defaults?: Partial<TransferRow>;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
  pending: boolean;
}) {
  return (
    <form action={onSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="w-36">
        <label className="stat-label block mb-1 text-[10px]">Date</label>
        <DatePicker name="date" defaultValue={defaults?.date ?? ""} required className="!py-1.5 !px-2 text-sm" />
      </div>
      <div>
        <label className="stat-label block mb-1 text-[10px]">From</label>
        <select name="from_account_id" defaultValue={defaults?.from_account_id ?? ""} required className="select !py-1.5 !px-2 text-sm">
          <option value="" disabled>Select</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="stat-label block mb-1 text-[10px]">To</label>
        <select name="to_account_id" defaultValue={defaults?.to_account_id ?? ""} required className="select !py-1.5 !px-2 text-sm">
          <option value="" disabled>Select</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
      <div className="w-28">
        <label className="stat-label block mb-1 text-[10px]">Amount</label>
        <input name="amount" type="number" step="0.01" min="0.01" defaultValue={defaults?.amount_usd ?? ""} required className="input !py-1.5 !px-2 text-sm num" />
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

export function TransfersTable({ transfers, accounts }: { transfers: TransferRow[]; accounts: Account[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? "—";

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const res = await addTransfer(undefined, formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setAdding(false);
      }
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      const res = await updateTransfer(id, formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setEditingId(null);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this transfer?")) return;
    startTransition(async () => {
      const res = await deleteTransfer(id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div>
      <p className="text-text-dim ios-subhead mb-4">
        Moving money between your own accounts — never counted as income or an expense.
      </p>

      <Glass>
        <div className="flex items-center justify-between p-4 pb-0">
          <div className="ios-headline">Transfers</div>
          {!adding && accounts.length >= 2 && (
            <button onClick={() => setAdding(true)} className="btn text-sm">
              + Add Transfer
            </button>
          )}
        </div>

        {accounts.length < 2 && (
          <p className="text-text-dim text-sm p-4">You need at least two accounts in Settings → Financial to log a transfer.</p>
        )}

        {adding && (
          <div className="p-4">
            <TransferForm accounts={accounts} onSubmit={handleAdd} onCancel={() => setAdding(false)} pending={pending} />
          </div>
        )}

        <HScroll>
        <table className="w-full text-sm min-w-[700px] mt-2">
          <thead>
            <tr className="text-text-dim text-left text-xs">
              <th className="py-3 px-2 font-normal">Date</th>
              <th className="py-3 px-2 font-normal">From</th>
              <th className="py-3 px-2 font-normal">To</th>
              <th className="py-3 px-2 font-normal text-right">Amount</th>
              <th className="py-3 px-2 font-normal">Notes</th>
              <th className="py-3 px-2 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-text-dim text-sm">
                  No transfers logged yet.
                </td>
              </tr>
            ) : (
              transfers.map((t) =>
                editingId === t.id ? (
                  <tr key={t.id} className="border-t border-[var(--separator)] bg-[rgba(0,0,0,0.03)]">
                    <td colSpan={6} className="py-3 px-2">
                      <TransferForm accounts={accounts} defaults={t} onSubmit={(fd) => handleUpdate(t.id, fd)} onCancel={() => setEditingId(null)} pending={pending} />
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id} className="border-t border-[var(--separator)] hover:bg-[rgba(0,0,0,0.03)] transition-colors">
                    <td className="py-2.5 px-2 num text-text-dim whitespace-nowrap">{t.date}</td>
                    <td className="py-2.5 px-2 text-text-dim">{nameOf(t.from_account_id)}</td>
                    <td className="py-2.5 px-2 text-text-dim">{nameOf(t.to_account_id)}</td>
                    <td className="py-2.5 px-2 text-right num">{fmtUsd(t.amount_usd)}</td>
                    <td className="py-2.5 px-2 text-text-dim text-xs">{t.notes ?? "—"}</td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">
                      <button onClick={() => setEditingId(t.id)} className="link-action text-[13px] mr-4">Edit</button>
                      <button onClick={() => handleDelete(t.id)} className="link-destructive text-[13px]">Delete</button>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
        </HScroll>
        {error && <p className="text-text-dim text-xs p-4">{error}</p>}
      </Glass>
    </div>
  );
}
