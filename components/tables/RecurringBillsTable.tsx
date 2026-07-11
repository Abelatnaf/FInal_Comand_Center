"use client";

import { useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/constants";
import { addRecurringBill, updateRecurringBill, deleteRecurringBill } from "@/app/(app)/recurring-bills/actions";

type Category = { id: number; name: string };

export type BillRow = {
  id: string;
  name: string;
  category_id: number | null;
  monthly_cost_usd: number;
  billing_day: number | null;
  payment_method: string | null;
  active: boolean;
  categories: { name: string } | null;
};

function daysUntilNextBilling(billingDay: number, today: Date): number {
  const day = today.getDate();
  if (billingDay >= day) return billingDay - day;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return daysInMonth - day + billingDay;
}

function BillForm({
  categories,
  defaults,
  onSubmit,
  onCancel,
  pending,
}: {
  categories: Category[];
  defaults?: Partial<BillRow>;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
  pending: boolean;
}) {
  return (
    <form action={onSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[140px]">
        <label className="stat-label block mb-1 text-[10px]">Name</label>
        <input name="name" defaultValue={defaults?.name ?? ""} required className="input !py-1.5 !px-2 text-sm w-full" />
      </div>
      <div>
        <label className="stat-label block mb-1 text-[10px]">Category</label>
        <select name="category_id" defaultValue={defaults?.category_id ?? ""} required className="select !py-1.5 !px-2 text-sm">
          <option value="" disabled>
            Select
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-24">
        <label className="stat-label block mb-1 text-[10px]">Monthly $</label>
        <input
          name="monthly_cost_usd"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaults?.monthly_cost_usd ?? ""}
          required
          className="input !py-1.5 !px-2 text-sm num"
        />
      </div>
      <div className="w-20">
        <label className="stat-label block mb-1 text-[10px]">Bill Day</label>
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
      <div>
        <label className="stat-label block mb-1 text-[10px]">Payment</label>
        <select name="payment_method" defaultValue={defaults?.payment_method ?? "SoFi Debit"} className="select !py-1.5 !px-2 text-sm">
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-1.5 text-xs text-text-dim pb-2">
        <input name="active" type="checkbox" defaultChecked={defaults?.active ?? true} className="accent-tint" />
        Active
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

export function RecurringBillsTable({ bills, categories }: { bills: BillRow[]; categories: Category[] }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const activeMonthlyTotal = bills.filter((b) => b.active).reduce((s, b) => s + b.monthly_cost_usd, 0);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const res = await addRecurringBill(formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setAdding(false);
      }
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      const res = await updateRecurringBill(id, formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setEditingId(null);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this recurring bill?")) return;
    startTransition(async () => {
      const res = await deleteRecurringBill(id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Glass className="p-6">
          <div className="stat-label mb-2">Total Active Monthly Recurring</div>
          <div className="stat-value">{fmtUsd(activeMonthlyTotal)}</div>
        </Glass>
        <Glass className="p-6">
          <div className="stat-label mb-2">Upcoming Billing (next 7 days)</div>
          <div className="flex flex-col gap-1 mt-2">
            {bills
              .filter((b) => b.active && b.billing_day && daysUntilNextBilling(b.billing_day, today) <= 7)
              .map((b) => (
                <div key={b.id} className="text-sm text-text-dim flex justify-between">
                  <span>{b.name}</span>
                  <span className="num text-text-dim">
                    in {daysUntilNextBilling(b.billing_day!, today)}d
                  </span>
                </div>
              ))}
            {bills.filter((b) => b.active && b.billing_day && daysUntilNextBilling(b.billing_day, today) <= 7)
              .length === 0 && <div className="text-text-dim text-sm">Nothing due this week.</div>}
          </div>
        </Glass>
      </div>

      <Glass className="overflow-x-auto">
        <div className="flex items-center justify-between p-4 pb-0">
          <div className="font-display text-lg font-semibold">Recurring Bills</div>
          {!adding && (
            <button onClick={() => setAdding(true)} className="btn text-sm">
              + Add Bill
            </button>
          )}
        </div>

        {adding && (
          <div className="p-4">
            <BillForm categories={categories} onSubmit={handleAdd} onCancel={() => setAdding(false)} pending={pending} />
          </div>
        )}

        <table className="w-full text-sm min-w-[800px] mt-2">
          <thead>
            <tr className="text-text-dim text-left text-xs">
              <th className="py-3 px-2 font-normal">Name</th>
              <th className="py-3 px-2 font-normal">Category</th>
              <th className="py-3 px-2 font-normal text-right">Monthly</th>
              <th className="py-3 px-2 font-normal">Bill Day</th>
              <th className="py-3 px-2 font-normal">Payment</th>
              <th className="py-3 px-2 font-normal">Status</th>
              <th className="py-3 px-2 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-text-dim text-sm">
                  No recurring bills yet.
                </td>
              </tr>
            ) : (
              bills.map((b) =>
                editingId === b.id ? (
                  <tr key={b.id} className="border-t border-[#2c2c2e] bg-[rgba(255,255,255,0.05)]">
                    <td colSpan={7} className="py-3 px-2">
                      <BillForm
                        categories={categories}
                        defaults={b}
                        onSubmit={(fd) => handleUpdate(b.id, fd)}
                        onCancel={() => setEditingId(null)}
                        pending={pending}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={b.id} className="border-t border-[#2c2c2e] hover:bg-[rgba(255,255,255,0.05)]">
                    <td className="py-2.5 px-2 text-text-dim">{b.name}</td>
                    <td className="py-2.5 px-2 text-text-dim">{b.categories?.name ?? "—"}</td>
                    <td className="py-2.5 px-2 text-right num">{fmtUsd(b.monthly_cost_usd)}</td>
                    <td className="py-2.5 px-2 num text-text-dim">{b.billing_day ?? "—"}</td>
                    <td className="py-2.5 px-2 text-text-dim text-xs whitespace-nowrap">{b.payment_method ?? "—"}</td>
                    <td className="py-2.5 px-2">
                      <span className={`badge ${b.active ? "" : "badge-dim"}`}>{b.active ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="py-2.5 px-2 text-right whitespace-nowrap">
                      <button onClick={() => setEditingId(b.id)} className="text-text-dim hover:text-text text-xs mr-3">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(b.id)} className="text-text-dim hover:text-text text-xs">
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
    </div>
  );
}
