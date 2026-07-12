"use client";

import { useMemo, useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { updateTransaction, deleteTransaction, getReceiptUrl } from "@/app/(app)/transactions/actions";
import { PAYMENT_METHODS } from "@/lib/constants";
import { DatePicker } from "@/components/ui/DatePicker";

type Category = { id: number; name: string };

export type TransactionRow = {
  id: string;
  date: string;
  week_number: number | null;
  category_id: number | null;
  description: string | null;
  necessity: string | null;
  is_recurring: boolean;
  currency: string;
  amount_original: number;
  amount_usd: number | null;
  payment_method: string | null;
  notes: string | null;
  receipt_path: string | null;
  categories: { name: string } | null;
  transaction_splits: { id: string; category_id: number | null; amount_usd: number; categories: { name: string } | null }[] | null;
};

type SplitRow = { id: number; categoryId: string; amount: string };

function ReceiptLink({ path }: { path: string }) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    const res = await getReceiptUrl(path);
    setLoading(false);
    if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
  }

  return (
    <button onClick={open} disabled={loading} className="link-action text-[13px]" title="View receipt">
      {loading ? "…" : "📎"}
    </button>
  );
}

function TransactionEditRow({
  tx,
  categories,
  fxRate,
  onDone,
}: {
  tx: TransactionRow;
  categories: Category[];
  fxRate: number;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const existingSplits = tx.transaction_splits ?? [];
  const [amount, setAmount] = useState(String(tx.amount_original));
  const [currency, setCurrency] = useState(tx.currency);
  const [splitOn, setSplitOn] = useState(existingSplits.length > 1);
  const [splits, setSplits] = useState<SplitRow[]>(
    existingSplits.length > 1
      ? existingSplits.map((s, i) => ({ id: i + 1, categoryId: String(s.category_id ?? ""), amount: String(s.amount_usd) }))
      : [
          { id: 1, categoryId: "", amount: "" },
          { id: 2, categoryId: "", amount: "" },
        ]
  );

  const usdPreview = useMemo(() => {
    const n = parseFloat(amount);
    if (!n || Number.isNaN(n)) return null;
    return currency === "USD" ? n : n / fxRate;
  }, [amount, currency, fxRate]);

  const splitTotal = splits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const splitTarget = usdPreview ?? (parseFloat(amount) || 0);
  const splitMismatch = splitOn && Math.abs(splitTotal - splitTarget) > 0.01;

  function addSplitRow() {
    setSplits((rows) => [...rows, { id: Date.now(), categoryId: "", amount: "" }]);
  }
  function removeSplitRow(id: number) {
    setSplits((rows) => (rows.length > 2 ? rows.filter((r) => r.id !== id) : rows));
  }
  function updateSplitRow(id: number, patch: Partial<SplitRow>) {
    setSplits((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleSave(formData: FormData) {
    if (splitOn && !splitMismatch) {
      const rows = splits
        .filter((r) => r.categoryId && parseFloat(r.amount) > 0)
        .map((r) => ({ category_id: Number(r.categoryId), amount_usd: parseFloat(r.amount) }));
      if (rows.length > 1) formData.set("splits", JSON.stringify(rows));
    }
    startTransition(async () => {
      const res = await updateTransaction(tx.id, formData);
      if (res?.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <tr className="border-t border-[var(--separator)] bg-[rgba(0,0,0,0.03)]">
      <td colSpan={8} className="py-3 px-2">
        <form action={handleSave} className="flex flex-wrap gap-2 items-end">
          <div className="w-36">
            <label className="stat-label block mb-1 text-[10px]">Date</label>
            <DatePicker name="date" defaultValue={tx.date} required className="!py-1.5 !px-2 text-sm" />
          </div>
          {!splitOn && (
            <div>
              <label className="stat-label block mb-1 text-[10px]">Category</label>
              <select name="category_id" defaultValue={tx.category_id ?? ""} required className="select !py-1.5 !px-2 text-sm">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-1 min-w-[140px]">
            <label className="stat-label block mb-1 text-[10px]">Description</label>
            <input name="description" defaultValue={tx.description ?? ""} className="input !py-1.5 !px-2 text-sm w-full" />
          </div>
          <div>
            <label className="stat-label block mb-1 text-[10px]">Necessity</label>
            <select name="necessity" defaultValue={tx.necessity ?? "Necessary"} className="select !py-1.5 !px-2 text-sm">
              <option value="Necessary">Necessary</option>
              <option value="Discretionary">Discretionary</option>
            </select>
          </div>
          <div className="w-20">
            <label className="stat-label block mb-1 text-[10px]">Currency</label>
            <select
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="select !py-1.5 !px-2 text-sm"
            >
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="input !py-1.5 !px-2 text-sm num"
            />
          </div>

          <label className="flex items-center gap-2 ios-footnote text-text pb-1.5 w-full">
            <input
              type="checkbox"
              className="ios-switch"
              checked={splitOn}
              onChange={(e) => setSplitOn(e.target.checked)}
            />
            Split into categories
          </label>

          {splitOn && (
            <div className="flex flex-col gap-2 rounded-[12px] p-3 w-full" style={{ background: "var(--fill-quaternary)" }}>
              <input type="hidden" name="category_id" value={splits.find((r) => r.categoryId)?.categoryId ?? tx.category_id ?? categories[0]?.id ?? ""} />
              {splits.map((row, i) => (
                <div key={row.id} className="flex gap-2 items-end">
                  <div className="flex-1">
                    {i === 0 && <label className="stat-label block mb-1 text-[10px]">Category</label>}
                    <select
                      value={row.categoryId}
                      onChange={(e) => updateSplitRow(row.id, { categoryId: e.target.value })}
                      className="select w-full !py-1.5 !px-2 text-sm"
                    >
                      <option value="">Select</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    {i === 0 && <label className="stat-label block mb-1 text-[10px]">Amount</label>}
                    <input
                      type="number"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => updateSplitRow(row.id, { amount: e.target.value })}
                      className="input w-full !py-1.5 !px-2 text-sm num"
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSplitRow(row.id)}
                    disabled={splits.length <= 2}
                    className="link-destructive text-[13px] pb-1.5 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" onClick={addSplitRow} className="link-action text-[13px] self-start">
                + Add category
              </button>
              <div className={`text-[12px] num ${splitMismatch ? "text-red" : "text-text-dim"}`}>
                {splitTarget > 0
                  ? `Split total: $${splitTotal.toFixed(2)} of $${splitTarget.toFixed(2)}${splitMismatch ? " — must match the amount above" : " ✓"}`
                  : "Enter the amount above first."}
              </div>
            </div>
          )}

          <div>
            <label className="stat-label block mb-1 text-[10px]">Payment</label>
            <input
              name="payment_method"
              type="text"
              list="payment-methods-edit"
              defaultValue={tx.payment_method ?? ""}
              className="input !py-1.5 !px-2 text-sm"
            />
            <datalist id="payment-methods-edit">
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="stat-label block mb-1 text-[10px]">Notes</label>
            <input name="notes" defaultValue={tx.notes ?? ""} className="input !py-1.5 !px-2 text-sm w-full" />
          </div>
          <label className="flex items-center gap-2 ios-footnote text-text pb-1.5">
            Recurring
            <input name="is_recurring" type="checkbox" defaultChecked={tx.is_recurring} className="ios-switch" />
          </label>
          <div>
            <label className="stat-label block mb-1 text-[10px]">{tx.receipt_path ? "Replace Receipt" : "Add Receipt"}</label>
            <input name="receipt" type="file" accept="image/*,application/pdf" className="input !py-1.5 text-xs" style={{ maxWidth: 160 }} />
          </div>
          <div className="flex gap-1.5">
            <button type="submit" disabled={pending || (splitOn && splitMismatch)} className="btn btn-primary !py-1.5 !px-3 text-xs">
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

function TransactionRowView({ tx, onEdit }: { tx: TransactionRow; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm("Delete this transaction?")) return;
    startTransition(async () => {
      const res = await deleteTransaction(tx.id);
      if (res?.error) setError(res.error);
    });
  }

  const splits = tx.transaction_splits ?? [];
  const isSplit = splits.length > 1;
  const categoryLabel = isSplit
    ? `Split (${splits.length})`
    : tx.categories?.name ?? "—";
  const categoryTitle = isSplit
    ? splits.map((s) => `${s.categories?.name ?? "—"}: ${fmtUsd(s.amount_usd)}`).join(", ")
    : undefined;

  return (
    <tr className="border-t border-[var(--separator)] hover:bg-[rgba(0,0,0,0.03)]">
      <td className="py-2.5 px-2 num text-xs text-text-dim whitespace-nowrap">{tx.date}</td>
      <td className="py-2.5 px-2 num text-xs text-text-dim">{tx.week_number ?? "—"}</td>
      <td className="py-2.5 px-2 text-text-dim whitespace-nowrap" title={categoryTitle}>{categoryLabel}</td>
      <td className="py-2.5 px-2 text-text-dim">
        <span className="inline-flex items-center gap-1.5">
          {tx.description ?? "—"}
          {tx.receipt_path && <ReceiptLink path={tx.receipt_path} />}
        </span>
      </td>
      <td className="py-2.5 px-2 text-xs text-text-dim whitespace-nowrap">{tx.necessity ?? "—"}</td>
      <td className="py-2.5 px-2 text-right num">{fmtUsd(tx.amount_usd ?? 0)}</td>
      <td className="py-2.5 px-2 text-xs text-text-dim whitespace-nowrap">{tx.payment_method ?? "—"}</td>
      <td className="py-2.5 px-2 text-right whitespace-nowrap">
        <button onClick={onEdit} className="link-action text-[13px] mr-4">
          Edit
        </button>
        <button onClick={handleDelete} disabled={pending} className="link-destructive text-[13px]">
          {pending ? "…" : "Delete"}
        </button>
        {error && <div className="text-text-dim text-[10px] mt-1">{error}</div>}
      </td>
    </tr>
  );
}

export function TransactionsTable({
  transactions,
  categories,
  fxRate,
}: {
  transactions: TransactionRow[];
  categories: Category[];
  fxRate: number;
}) {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [necessityFilter, setNecessityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (categoryFilter && String(t.category_id) !== categoryFilter) return false;
      if (necessityFilter && t.necessity !== necessityFilter) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [transactions, categoryFilter, necessityFilter, dateFrom, dateTo]);

  function exportCsv() {
    const header = [
      "Date",
      "Week",
      "Category",
      "Description",
      "Necessary/Discretionary",
      "Recurring",
      "Currency",
      "Amount (Original)",
      "Amount (USD)",
      "Payment Method",
      "Notes",
    ];
    const rows = filtered.map((t) => [
      t.date,
      t.week_number ?? "",
      t.categories?.name ?? "",
      t.description ?? "",
      t.necessity ?? "",
      t.is_recurring ? "Yes" : "No",
      t.currency,
      t.amount_original,
      t.amount_usd ?? "",
      t.payment_method ?? "",
      t.notes ?? "",
    ]);
    downloadCsv([header, ...rows], "transactions.csv");
  }

  return (
    <div>
      <Glass className="p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="stat-label block mb-1 text-xs">Category</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="select text-sm">
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="stat-label block mb-1 text-xs">Necessity</label>
          <select value={necessityFilter} onChange={(e) => setNecessityFilter(e.target.value)} className="select text-sm">
            <option value="">All</option>
            <option value="Necessary">Necessary</option>
            <option value="Discretionary">Discretionary</option>
          </select>
        </div>
        <div className="w-40">
          <label className="stat-label block mb-1 text-xs">From</label>
          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Any" className="text-sm" />
        </div>
        <div className="w-40">
          <label className="stat-label block mb-1 text-xs">To</label>
          <DatePicker value={dateTo} onChange={setDateTo} placeholder="Any" className="text-sm" />
        </div>
        <button onClick={exportCsv} className="btn text-sm ml-auto">
          Export CSV
        </button>
      </Glass>

      <Glass className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-text-dim text-left text-xs">
              <th className="py-3 px-2 font-normal">Date</th>
              <th className="py-3 px-2 font-normal">Wk</th>
              <th className="py-3 px-2 font-normal">Category</th>
              <th className="py-3 px-2 font-normal">Description</th>
              <th className="py-3 px-2 font-normal">Necessity</th>
              <th className="py-3 px-2 font-normal text-right">Amount (USD)</th>
              <th className="py-3 px-2 font-normal">Payment</th>
              <th className="py-3 px-2 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-text-dim text-sm">
                  No transactions yet — use Quick Add to log your first one.
                </td>
              </tr>
            ) : (
              filtered.map((tx) =>
                editingId === tx.id ? (
                  <TransactionEditRow key={tx.id} tx={tx} categories={categories} fxRate={fxRate} onDone={() => setEditingId(null)} />
                ) : (
                  <TransactionRowView key={tx.id} tx={tx} onEdit={() => setEditingId(tx.id)} />
                )
              )
            )}
          </tbody>
        </table>
      </Glass>
    </div>
  );
}
