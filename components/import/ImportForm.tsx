"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importTransactions } from "@/app/(app)/import/actions";
import { Amount } from "@/components/money/Amount";
import { formatShortDate } from "@/lib/date";
import {
  parseCsv,
  findHeaderRow,
  guessColumns,
  toEntries,
  type ColumnGuess,
  type ParsedRow,
} from "@/lib/bank-csv";

type Account = { id: string; name: string };

export function ImportForm({ accounts }: { accounts: Account[] }) {
  const [header, setHeader] = useState<string[] | null>(null);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [columns, setColumns] = useState<ColumnGuess | null>(null);
  const [flipSign, setFlipSign] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setError("That file doesn't have any rows I can read.");
      return;
    }
    const headerIndex = findHeaderRow(rows);
    const headerRow = rows[headerIndex];
    const guess = guessColumns(headerRow);

    if (guess.date < 0 || (guess.amount < 0 && guess.debit < 0 && guess.credit < 0)) {
      setError(
        "I couldn't find a date and an amount column. Check this is the transactions CSV your bank exports."
      );
      return;
    }

    setFileName(file.name);
    setHeader(headerRow);
    setDataRows(rows.slice(headerIndex + 1));
    setColumns(guess);
  }

  const parsed: { rows: ParsedRow[]; skipped: number } | null =
    header && columns ? toEntries(dataRows, columns, flipSign) : null;

  const outCount = parsed?.rows.filter((r) => r.direction === "out").length ?? 0;
  const inCount = parsed?.rows.filter((r) => r.direction === "in").length ?? 0;

  function handleImport() {
    if (!parsed) return;
    startTransition(async () => {
      const res = await importTransactions(accountId, parsed.rows);
      if (res.error) {
        setError(res.error);
        return;
      }
      setResult(
        `Imported ${res.imported}. ${res.skipped ? `Skipped ${res.skipped} already logged.` : ""}`
      );
      setHeader(null);
      setDataRows([]);
      setColumns(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="card row flex flex-col gap-3">
        <p className="section-label">1. Pick your file</p>
        <p className="text-[14px] text-muted">
          Download your transactions as CSV from your bank or card issuer, then choose it here.
          Chase, Bank of America, Capital One, Amex, Wells Fargo and Discover all export a
          compatible file — as does anything else with date, description and amount columns.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          className="input"
          aria-label="CSV file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {fileName && <p className="text-[13px] text-muted">{fileName}</p>}
      </div>

      {error && (
        <div className="card row">
          <p className="text-alarm text-[14px]">{error}</p>
        </div>
      )}

      {result && (
        <div className="card row">
          <p className="text-positive text-[15px]">{result}</p>
        </div>
      )}

      {header && columns && parsed && (
        <>
          <div className="card">
            <p className="section-label row pb-0">2. Check the columns</p>
            <div className="row flex flex-col gap-2">
              <label className="section-label" htmlFor="col-date">
                Date
              </label>
              <select
                id="col-date"
                className="input"
                value={columns.date}
                onChange={(e) => setColumns({ ...columns, date: Number(e.target.value) })}
              >
                {header.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>

              <label className="section-label" htmlFor="col-desc">
                Description
              </label>
              <select
                id="col-desc"
                className="input"
                value={columns.description}
                onChange={(e) => setColumns({ ...columns, description: Number(e.target.value) })}
              >
                <option value={-1}>— none —</option>
                {header.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>

              <label className="section-label" htmlFor="col-amount">
                Amount
              </label>
              <select
                id="col-amount"
                className="input"
                value={columns.amount}
                onChange={(e) => setColumns({ ...columns, amount: Number(e.target.value) })}
              >
                {header.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </select>

              {(columns.debit >= 0 || columns.credit >= 0) && (
                <p className="text-[13px] text-muted">
                  This file has separate Debit and Credit columns; those are used where present.
                </p>
              )}
            </div>
          </div>

          <div className="card row flex flex-col gap-3">
            <p className="section-label">3. Check the direction</p>
            <div className="flex gap-4 text-[15px]">
              <span>
                <strong className="num">{outCount}</strong> spent
              </span>
              <span className="text-positive">
                <strong className="num">{inCount}</strong> received
              </span>
              {parsed.skipped > 0 && (
                <span className="text-muted">
                  <strong className="num">{parsed.skipped}</strong> unreadable
                </span>
              )}
            </div>
            <label className="flex items-center gap-2.5 text-[15px] text-text">
              <input type="checkbox" checked={flipSign} onChange={(e) => setFlipSign(e.target.checked)} />
              Flip these round
            </label>
            <p className="text-[13px] text-faint">
              Most banks list purchases as negative, which is what this expects. If your spending is
              showing up as money received, tick the box.
            </p>
          </div>

          <div className="card row flex flex-col gap-3">
            <p className="section-label">4. Import into</p>
            <select
              className="input"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              aria-label="Account"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="text-[13px] text-faint">
              Anything already logged on this account for the same day and amount is skipped, so
              re-importing an overlapping statement won&rsquo;t double-count. Your auto-categorize
              rules run on every imported row.
            </p>
          </div>

          <div className="card">
            <p className="section-label row pb-0">Preview — first 10 of {parsed.rows.length}</p>
            {parsed.rows.slice(0, 10).map((r, i) => (
              <div key={i} className="row flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] truncate">{r.note || "—"}</p>
                  <p className="text-[13px] text-muted">{formatShortDate(r.occurred_on)}</p>
                </div>
                <Amount
                  minor={BigInt(r.direction === "out" ? -r.amount_minor : r.amount_minor)}
                  className={r.direction === "in" ? "text-positive shrink-0" : "shrink-0"}
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || parsed.rows.length === 0}
            onClick={handleImport}
          >
            {busy ? "Importing…" : `Import ${parsed.rows.length} entries`}
          </button>
        </>
      )}
    </div>
  );
}
