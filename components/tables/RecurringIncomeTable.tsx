"use client";

import { useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { HScroll } from "@/components/ui/HScroll";
import { fmtUsd } from "@/lib/format";
import { addRecurringIncome, updateRecurringIncome, deleteRecurringIncome } from "@/app/(app)/recurring-bills/actions";

type Account = { id: string; name: string };

export type RecurringIncomeRow = {
  id: string;
  source: string;
  amount_usd: number;
  billing_day: number | null;
  account_id: string | null;
  active: boolean;
};

function IncomeForm({
  accounts,
  defaults,
  onSubmit,
  onCancel,
  pending,
}: {
  accounts: Account[];
  defaults?: Partial<RecurringIncomeRow>;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
  pending: boolean;
}) {
  return (
    <form action={onSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[140px]">
        <label className="stat-label block mb-1 text-[10px]">Source</label>
        <input name="source" defaultValue={defaults?.source ?? ""} required className="input !py-1.5 !px-2 text-sm w-full" placeholder="Paycheck" />
      </div>
      <div className="w-24">
        <label className="stat-label block mb-1 text-[10px]">Amount $</label>
        <input
          name="amount_usd"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaults?.amount_usd ?? ""}
          required
          className="input !py-1.5 !px-2 text-sm num"
        />
      </div>
      <div className="w-20">
        <label className="stat-label block mb-1 text-[10px]">Pay Day</label>
        <input
          name="billing_day"
          type="number"
          min="1"
          max="31"
          defaultValue={defaults?.billing_day ?? ""}
          required
          className="input !py-1.5 !px-2 text-sm num"
        />
      </div>
      <div className="w-36">
        <label className="stat-label block mb-1 text-[10px]">Account</label>
        <select name="account_id" defaultValue={defaults?.account_id ?? ""} className="select !py-1.5 !px-2 text-sm w-full">
          <option value="">No account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 ios-footnote text-text pb-1.5">
        Active
        <input name="active" type="checkbox" defaultChecked={defaults?.active ?? true} className="ios-switch" />
      </label>
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

export function RecurringIncomeTable({ income, accounts }: { income: RecurringIncomeRow[]; accounts: Account[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const activeMonthlyTotal = income.filter((i) => i.active).reduce((s, i) => s + i.amount_usd, 0);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const res = await addRecurringIncome(formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setAdding(false);
      }
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      const res = await updateRecurringIncome(id, formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setEditingId(null);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this recurring income?")) return;
    startTransition(async () => {
      const res = await deleteRecurringIncome(id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <Glass>
      <div className="flex items-center justify-between p-4 pb-0">
        <div>
          <div className="ios-headline">Recurring Income</div>
          <div className="stat-label mt-0.5">
            {fmtUsd(activeMonthlyTotal)}/mo active — posts automatically to Income on payday, mirroring Recurring Bills.
          </div>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn text-sm shrink-0">
            + Add Income
          </button>
        )}
      </div>

      {adding && (
        <div className="p-4">
          <IncomeForm accounts={accounts} onSubmit={handleAdd} onCancel={() => setAdding(false)} pending={pending} />
        </div>
      )}

      <HScroll>
        <table className="w-full text-sm min-w-[700px] mt-2">
          <thead>
            <tr className="text-text-dim text-left text-xs">
              <th className="py-3 px-2 font-normal">Source</th>
              <th className="py-3 px-2 font-normal text-right">Amount</th>
              <th className="py-3 px-2 font-normal">Pay Day</th>
              <th className="py-3 px-2 font-normal">Account</th>
              <th className="py-3 px-2 font-normal">Status</th>
              <th className="py-3 px-2 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {income.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-text-dim text-sm">
                  No recurring income yet.
                </td>
              </tr>
            ) : (
              income.map((i) =>
                editingId === i.id ? (
                  <tr key={i.id} className="border-t border-[var(--separator)] bg-[rgba(0,0,0,0.03)]">
                    <td colSpan={6} className="py-3 px-2">
                      <IncomeForm
                        accounts={accounts}
                        defaults={i}
                        onSubmit={(fd) => handleUpdate(i.id, fd)}
                        onCancel={() => setEditingId(null)}
                        pending={pending}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={i.id} className="border-t border-[var(--separator)] hover:bg-[rgba(0,0,0,0.03)] transition-colors">
                    <td className="py-2.5 px-2 text-text-dim">{i.source}</td>
                    <td className="py-2.5 px-2 text-right num pos">{fmtUsd(i.amount_usd)}</td>
                    <td className="py-2.5 px-2 num text-text-dim">{i.billing_day ?? "—"}</td>
                    <td className="py-2.5 px-2 text-text-dim text-xs">{accounts.find((a) => a.id === i.account_id)?.name ?? "—"}</td>
                    <td className="py-2.5 px-2">
                      <span className={`badge ${i.active ? "" : "badge-dim"}`}>{i.active ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">
                      <button onClick={() => setEditingId(i.id)} className="link-action text-[13px] mr-4">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(i.id)} className="link-destructive text-[13px]">
                        Delete
                      </button>
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
  );
}
