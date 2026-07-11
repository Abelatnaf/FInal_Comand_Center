"use client";

import { useMemo, useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { updateIncome, deleteIncome } from "@/app/(app)/income/actions";
import { INCOME_SOURCES } from "@/lib/constants";

export type IncomeRow = {
  id: string;
  date: string;
  cadet_week: number | null;
  source: string | null;
  currency: string;
  amount_original: number;
  amount_usd: number | null;
  notes: string | null;
};

function IncomeEditRow({ row, onDone }: { row: IncomeRow; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(formData: FormData) {
    startTransition(async () => {
      const res = await updateIncome(row.id, formData);
      if (res?.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <tr className="border-t border-[#241c14] bg-[rgba(201,162,75,0.035)]">
      <td colSpan={6} className="py-3 px-2">
        <form action={handleSave} className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="stat-label block mb-1 text-[10px]">Date</label>
            <input name="date" type="date" defaultValue={row.date} required className="input !py-1.5 !px-2 text-sm" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="stat-label block mb-1 text-[10px]">Source</label>
            <input
              name="source"
              defaultValue={row.source ?? ""}
              list="income-sources-edit"
              className="input !py-1.5 !px-2 text-sm w-full"
            />
            <datalist id="income-sources-edit">
              {INCOME_SOURCES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="w-20">
            <label className="stat-label block mb-1 text-[10px]">Currency</label>
            <select name="currency" defaultValue={row.currency} className="select !py-1.5 !px-2 text-sm">
              <option value="USD">USD</option>
              <option value="ETB">ETB</option>
            </select>
          </div>
          <div className="w-24">
            <label className="stat-label block mb-1 text-[10px]">Amount</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              defaultValue={row.amount_original}
              required
              className="input !py-1.5 !px-2 text-sm num"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="stat-label block mb-1 text-[10px]">Notes</label>
            <input name="notes" defaultValue={row.notes ?? ""} className="input !py-1.5 !px-2 text-sm w-full" />
          </div>
          <div className="flex gap-1.5">
            <button type="submit" disabled={pending} className="btn btn-primary !py-1.5 !px-3 text-xs">
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={onDone} className="btn !py-1.5 !px-3 text-xs">
              Cancel
            </button>
          </div>
        </form>
        {error && <p className="text-text-dim text-xs mt-1.5">{error}</p>}
      </td>
    </tr>
  );
}

function IncomeRowView({ row, onEdit }: { row: IncomeRow; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm("Delete this income entry?")) return;
    startTransition(async () => {
      const res = await deleteIncome(row.id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <tr className="border-t border-[#241c14] hover:bg-[rgba(201,162,75,0.035)]">
      <td className="py-2.5 px-2 num text-xs text-text-dim whitespace-nowrap">{row.date}</td>
      <td className="py-2.5 px-2 num text-xs text-text-dim">{row.cadet_week ?? "—"}</td>
      <td className="py-2.5 px-2 text-text-dim whitespace-nowrap">{row.source ?? "—"}</td>
      <td className="py-2.5 px-2 text-right num">{fmtUsd(row.amount_usd ?? 0)}</td>
      <td className="py-2.5 px-2 text-text-dim">{row.notes ?? "—"}</td>
      <td className="py-2.5 px-2 text-right whitespace-nowrap">
        <button onClick={onEdit} className="text-text-dim hover:text-text text-xs mr-3">
          Edit
        </button>
        <button onClick={handleDelete} disabled={pending} className="text-text-dim hover:text-text text-xs">
          {pending ? "…" : "Delete"}
        </button>
        {error && <div className="text-text-dim text-[10px] mt-1">{error}</div>}
      </td>
    </tr>
  );
}

export function IncomeTable({ income }: { income: IncomeRow[] }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return income.filter((r) => {
      if (sourceFilter && r.source !== sourceFilter) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      return true;
    });
  }, [income, sourceFilter, dateFrom, dateTo]);

  function exportCsv() {
    const header = ["Date", "Cadet Week", "Source", "Currency", "Amount (Original)", "Amount (USD)", "Notes"];
    const rows = filtered.map((r) => [
      r.date,
      r.cadet_week ?? "",
      r.source ?? "",
      r.currency,
      r.amount_original,
      r.amount_usd ?? "",
      r.notes ?? "",
    ]);
    downloadCsv([header, ...rows], "income.csv");
  }

  return (
    <div>
      <Glass className="p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="stat-label block mb-1 text-xs">Source</label>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="select text-sm">
            <option value="">All</option>
            {INCOME_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="stat-label block mb-1 text-xs">From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="stat-label block mb-1 text-xs">To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input text-sm" />
        </div>
        <button onClick={exportCsv} className="btn text-sm ml-auto">
          Export CSV
        </button>
      </Glass>

      <Glass className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-text-dim text-left text-xs">
              <th className="py-3 px-2 font-normal">Date</th>
              <th className="py-3 px-2 font-normal">Wk</th>
              <th className="py-3 px-2 font-normal">Source</th>
              <th className="py-3 px-2 font-normal text-right">Amount (USD)</th>
              <th className="py-3 px-2 font-normal">Notes</th>
              <th className="py-3 px-2 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-text-dim text-sm">
                  No income logged yet — use Quick Add to log your first entry.
                </td>
              </tr>
            ) : (
              filtered.map((row) =>
                editingId === row.id ? (
                  <IncomeEditRow key={row.id} row={row} onDone={() => setEditingId(null)} />
                ) : (
                  <IncomeRowView key={row.id} row={row} onEdit={() => setEditingId(row.id)} />
                )
              )
            )}
          </tbody>
        </table>
      </Glass>
    </div>
  );
}
