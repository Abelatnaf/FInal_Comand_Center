"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { Glass } from "@/components/glass/Glass";
import { parseCsvText } from "@/lib/csv";
import { importEntries, type ImportRow, type ImportResult } from "@/app/(app)/transactions/import/actions";
import { fmtMoney } from "@/lib/format";

type Category = { id: string; name: string };
type Account = { id: string; name: string };

const DATE_PATTERNS = [/^date$/i, /post(ed)?.?date/i, /date/i];
const DESCRIPTION_PATTERNS = [/^description$/i, /payee|merchant|memo/i, /description/i];
const AMOUNT_PATTERNS = [/^amount$/i, /amount/i];

function guessColumn(headers: string[], patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => pattern.test(h.trim()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function ImportForm({ categories, accounts, currency }: { categories: Category[]; accounts: Account[]; currency: string }) {
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [dateCol, setDateCol] = useState(-1);
  const [descCol, setDescCol] = useState(-1);
  const [amountCol, setAmountCol] = useState(-1);
  const [flipSign, setFlipSign] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsvText(String(reader.result ?? ""));
      if (rows.length < 2) return;
      const [head, ...rest] = rows;
      setHeaders(head);
      setDataRows(rest);
      setDateCol(guessColumn(head, DATE_PATTERNS));
      setDescCol(guessColumn(head, DESCRIPTION_PATTERNS));
      setAmountCol(guessColumn(head, AMOUNT_PATTERNS));
      setResult(null);
    };
    reader.readAsText(file);
  }

  const parsedRows: (ImportRow | null)[] = useMemo(() => {
    if (dateCol < 0 || descCol < 0 || amountCol < 0) return [];
    return dataRows.map((r) => {
      const date = parseFlexibleDate(r[dateCol] ?? "");
      const rawAmount = parseAmount(r[amountCol] ?? "");
      const description = (r[descCol] ?? "").trim();
      if (!date || rawAmount === null || rawAmount === 0 || !description) return null;
      const signed = flipSign ? -rawAmount : rawAmount;
      return { date, description, amount: Math.abs(signed), type: signed >= 0 ? "income" : "expense" } as ImportRow;
    });
  }, [dataRows, dateCol, descCol, amountCol, flipSign]);

  const validRows = parsedRows.filter((r): r is ImportRow => r !== null);

  async function handleImport() {
    setImporting(true);
    const res = await importEntries(validRows, accountId || null, categoryId || null);
    setResult(res);
    setImporting(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <Glass className="p-5">
        <label className="stat-label block mb-2">Bank statement CSV</label>
        <input type="file" accept=".csv,text/csv" onChange={onFile} className="ios-body" />
        <p className="ios-footnote text-text-faint mt-2">
          Upload a CSV export from your bank. We&rsquo;ll guess which columns are the date, description, and amount —
          check them below before importing.
        </p>
      </Glass>

      {headers && (
        <>
          <Glass className="p-5 flex flex-col gap-3.5">
            <div className="section-header">Match Columns</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="stat-label block mb-1.5">Date</label>
                <select value={dateCol} onChange={(e) => setDateCol(Number(e.target.value))} className="select w-full">
                  <option value={-1}>Choose column</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-1.5">Description</label>
                <select value={descCol} onChange={(e) => setDescCol(Number(e.target.value))} className="select w-full">
                  <option value={-1}>Choose column</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-1.5">Amount</label>
                <select value={amountCol} onChange={(e) => setAmountCol(Number(e.target.value))} className="select w-full">
                  <option value={-1}>Choose column</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Column ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex items-center justify-between py-1">
              <span className="ios-body">Flip sign (if positive means you spent it)</span>
              <input
                type="checkbox"
                checked={flipSign}
                onChange={(e) => setFlipSign(e.target.checked)}
                className="ios-switch"
                style={{ width: 40, height: 24 }}
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="stat-label block mb-1.5">Account</label>
                <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="select w-full">
                  <option value="">No account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-1.5">Default category (for expenses)</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="select w-full">
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Glass>

          <Glass className="p-5">
            <div className="section-header mb-3">
              Preview — {validRows.length} of {dataRows.length} rows ready
            </div>
            <div className="max-h-64 overflow-y-auto flex flex-col gap-1.5">
              {parsedRows.slice(0, 25).map((r, i) =>
                r ? (
                  <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-[var(--separator)] last:border-0">
                    <span className="text-text-dim shrink-0">{r.date}</span>
                    <span className="flex-1 truncate px-3">{r.description}</span>
                    <span className={`num shrink-0 ${r.type === "income" ? "pos" : "neg"}`}>
                      {r.type === "income" ? "+" : "−"}
                      {fmtMoney(r.amount, currency)}
                    </span>
                  </div>
                ) : (
                  <div key={i} className="ios-footnote text-text-faint py-1">
                    Row {i + 1}: couldn&rsquo;t parse — will be skipped
                  </div>
                )
              )}
              {dataRows.length > 25 && <p className="ios-footnote text-text-faint pt-1">…and {dataRows.length - 25} more rows</p>}
            </div>
          </Glass>

          {result && (
            <p className="ios-body">
              {result.error
                ? `Something went wrong: ${result.error}`
                : `Imported ${result.imported} ${result.imported === 1 ? "entry" : "entries"}${
                    result.skipped > 0 ? `, skipped ${result.skipped} already-logged duplicate${result.skipped === 1 ? "" : "s"}` : ""
                  }.`}
            </p>
          )}

          <button onClick={handleImport} disabled={importing || validRows.length === 0} className="btn btn-primary w-full !py-3 !text-[17px]">
            {importing ? "Importing…" : `Import ${validRows.length} ${validRows.length === 1 ? "entry" : "entries"}`}
          </button>
        </>
      )}
    </div>
  );
}
