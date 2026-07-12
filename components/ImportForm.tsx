"use client";

import { useMemo, useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { parseCsv } from "@/lib/csv";
import { fmtUsd } from "@/lib/format";
import { importRows, type ImportRow, type ImportResult } from "@/app/(app)/import/actions";

type Category = { id: number; name: string };
type Currency = { code: string; name: string; rate_to_usd: number };

function parseDateFlexible(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const [, m, d, y] = slash;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dash) {
    const [, m, d, y] = dash;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseAmountFlexible(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const negative = /^\(.*\)$/.test(s) || s.trim().startsWith("-");
  const cleaned = s.replace(/[()$,\s-]/g, "");
  const n = parseFloat(cleaned);
  if (Number.isNaN(n)) return null;
  return negative ? -Math.abs(n) : n;
}

export function ImportForm({ categories, currencies }: { categories: Category[]; currencies: Currency[] }) {
  const allCurrencies = useMemo<Currency[]>(() => [{ code: "USD", name: "US Dollar", rate_to_usd: 1 }, ...currencies], [currencies]);

  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [dateCol, setDateCol] = useState(0);
  const [descCol, setDescCol] = useState(1);
  const [amountCol, setAmountCol] = useState(2);
  const [flipSign, setFlipSign] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [categoryId, setCategoryId] = useState<string>(categories[0] ? String(categories[0].id) : "");
  const [necessity, setNecessity] = useState("Necessary");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseCsv(text);
      if (parsed.length === 0) return;
      setHeaders(parsed[0]);
      setDataRows(parsed.slice(1));
      setDateCol(0);
      setDescCol(Math.min(1, parsed[0].length - 1));
      setAmountCol(Math.min(2, parsed[0].length - 1));
    };
    reader.readAsText(file);
  }

  const parsedRows = useMemo<(ImportRow & { rawDate: string; rawAmount: string })[]>(() => {
    return dataRows.map((r) => {
      const rawDate = r[dateCol] ?? "";
      const rawAmount = r[amountCol] ?? "";
      const date = parseDateFlexible(rawDate) ?? "";
      let amount = parseAmountFlexible(rawAmount) ?? 0;
      if (flipSign) amount = -amount;
      return {
        rawDate,
        rawAmount,
        date,
        description: (r[descCol] ?? "").trim(),
        amount: Math.abs(amount),
        isIncome: amount > 0,
        categoryId: categoryId ? Number(categoryId) : null,
      };
    });
  }, [dataRows, dateCol, descCol, amountCol, flipSign, categoryId]);

  const validCount = parsedRows.filter((r) => r.date && r.amount > 0).length;
  const invalidCount = parsedRows.length - validCount;

  function handleImport() {
    startTransition(async () => {
      const res = await importRows(
        parsedRows.filter((r) => r.date && r.amount > 0).map(({ date, description, amount, isIncome, categoryId }) => ({
          date,
          description,
          amount,
          isIncome,
          categoryId,
        })),
        currency,
        necessity
      );
      setResult(res);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Glass className="p-6">
        <div className="ios-headline mb-1">1. Choose a file</div>
        <p className="text-text-dim ios-subhead mb-4">
          Export a CSV from your bank (date, description, amount columns). Positive amounts are treated as income, negative as
          expenses — flip that below if your bank does it the other way.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="input !py-2 text-sm w-full max-w-sm"
        />
        {fileName && <p className="text-text-dim text-xs mt-2">Loaded {fileName} — {dataRows.length} rows.</p>}
      </Glass>

      {headers.length > 0 && (
        <>
          <Glass className="p-6">
            <div className="ios-headline mb-4">2. Map columns</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="stat-label block mb-1 text-[10px]">Date column</label>
                <select value={dateCol} onChange={(e) => setDateCol(Number(e.target.value))} className="select text-sm w-full">
                  {headers.map((h, i) => (
                    <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-1 text-[10px]">Description column</label>
                <select value={descCol} onChange={(e) => setDescCol(Number(e.target.value))} className="select text-sm w-full">
                  {headers.map((h, i) => (
                    <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-1 text-[10px]">Amount column</label>
                <select value={amountCol} onChange={(e) => setAmountCol(Number(e.target.value))} className="select text-sm w-full">
                  {headers.map((h, i) => (
                    <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-1 text-[10px]">Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="select text-sm w-full">
                  {allCurrencies.map((c) => (
                    <option key={c.code} value={c.code}>{c.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-1 text-[10px]">Default category (expenses)</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="select text-sm w-full">
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-1 text-[10px]">Default necessity (expenses)</label>
                <select value={necessity} onChange={(e) => setNecessity(e.target.value)} className="select text-sm w-full">
                  <option value="Necessary">Necessary</option>
                  <option value="Discretionary">Discretionary</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 ios-body mt-4">
              <input type="checkbox" className="ios-switch" checked={flipSign} onChange={(e) => setFlipSign(e.target.checked)} />
              Flip sign (my bank shows expenses as positive)
            </label>
          </Glass>

          <Glass className="p-6 overflow-x-auto">
            <div className="ios-headline mb-1">3. Preview</div>
            <p className="text-text-dim ios-subhead mb-4">
              {validCount} row{validCount === 1 ? "" : "s"} ready to import
              {invalidCount > 0 ? `, ${invalidCount} skipped (unparseable date or amount)` : ""}. Duplicates already in your
              records (same date, amount, currency) are skipped automatically.
            </p>
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-text-dim text-left text-xs">
                  <th className="py-2 px-2 font-normal">Date</th>
                  <th className="py-2 px-2 font-normal">Description</th>
                  <th className="py-2 px-2 font-normal text-right">Amount</th>
                  <th className="py-2 px-2 font-normal">Type</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 25).map((r, i) => (
                  <tr key={i} className="border-t border-[var(--separator)]">
                    <td className={`py-2 px-2 num text-xs ${r.date ? "text-text-dim" : "text-red"}`}>{r.date || r.rawDate || "—"}</td>
                    <td className="py-2 px-2 text-text-dim">{r.description || "—"}</td>
                    <td className={`py-2 px-2 num text-right ${r.amount > 0 ? "text-text-dim" : "text-red"}`}>
                      {r.amount > 0 ? fmtUsd(r.amount) : "invalid"}
                    </td>
                    <td className="py-2 px-2 text-text-dim">{r.isIncome ? "Income" : "Expense"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 25 && (
              <p className="text-text-dim text-xs mt-2">…and {parsedRows.length - 25} more rows not shown.</p>
            )}
          </Glass>

          <Glass className="p-6">
            <button
              onClick={handleImport}
              disabled={pending || validCount === 0}
              className="btn btn-primary"
            >
              {pending ? "Importing…" : `Import ${validCount} Row${validCount === 1 ? "" : "s"}`}
            </button>
            {result && (
              <p className="text-text-dim text-sm mt-3">
                {result.error
                  ? `Error: ${result.error}`
                  : `Imported ${result.inserted}, skipped ${result.skipped} (duplicates or invalid rows).`}
              </p>
            )}
          </Glass>
        </>
      )}
    </div>
  );
}
