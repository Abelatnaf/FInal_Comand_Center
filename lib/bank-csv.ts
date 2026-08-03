// Parsing for the CSV files US banks and card issuers export.
//
// Deliberately hand-rolled rather than pulling in a dependency: the format is
// small, and the parts that actually break on real files are the bank-specific
// quirks below, not the RFC-4180 core.

/** RFC-4180-ish: quoted fields, embedded commas and newlines, "" escapes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM: Excel adds one, and it would otherwise become part of
  // the first header name and break column matching.
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const char = src[i];

    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      // Consume \r\n as one break rather than emitting a blank row between.
      if (char === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const DATE_PATTERNS = ["date", "posted", "transaction date", "trans date", "posting"];
const DESC_PATTERNS = ["description", "payee", "merchant", "name", "memo", "details", "original description"];
const AMOUNT_PATTERNS = ["amount", "debit", "credit", "transaction amount"];

function matches(header: string, patterns: string[]): boolean {
  const h = header.trim().toLowerCase();
  return patterns.some((p) => h.includes(p));
}

/**
 * Finds the real header row. Several banks (Bank of America's checking export
 * is the usual offender) put a summary preamble above it, so row 0 is not
 * reliably the header — the first row containing both a date-ish and an
 * amount-ish cell is.
 */
export function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    const hasDate = row.some((c) => matches(c, DATE_PATTERNS));
    const hasAmount = row.some((c) => matches(c, AMOUNT_PATTERNS));
    if (hasDate && hasAmount) return i;
  }
  return 0;
}

export type ColumnGuess = {
  date: number;
  description: number;
  amount: number;
  /** Some issuers split into separate Debit and Credit columns instead. */
  debit: number;
  credit: number;
};

export function guessColumns(header: string[]): ColumnGuess {
  const find = (patterns: string[], exclude: string[] = []) =>
    header.findIndex(
      (h) => matches(h, patterns) && !exclude.some((e) => h.trim().toLowerCase().includes(e))
    );

  const debit = header.findIndex((h) => h.trim().toLowerCase() === "debit");
  const credit = header.findIndex((h) => h.trim().toLowerCase() === "credit");

  return {
    // "Posted Date" beats "Transaction Date" only by being first; either works.
    date: find(DATE_PATTERNS),
    description: find(DESC_PATTERNS),
    // Exclude running-balance columns, which also contain "amount" at some banks.
    amount: find(["amount"], ["balance", "running"]),
    debit,
    credit,
  };
}

/**
 * Bank date columns are almost always MM/DD/YYYY in the US, sometimes
 * YYYY-MM-DD, occasionally MM/DD/YY. Returns null rather than guessing at
 * anything else -- a misread date silently files a purchase in the wrong month.
 */
export function parseBankDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const us = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (us) {
    const month = us[1].padStart(2, "0");
    const day = us[2].padStart(2, "0");
    let year = us[3];
    if (year.length === 2) year = `20${year}`;
    if (Number(month) < 1 || Number(month) > 12) return null;
    if (Number(day) < 1 || Number(day) > 31) return null;
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Bank amounts arrive as "-45.20", "(45.20)", "$1,234.56". Returns cents as a
 * signed integer, or null when the cell isn't a number at all.
 */
export function parseBankAmount(raw: string): number | null {
  let value = raw.trim();
  if (!value) return null;

  // Accounting-style parentheses mean negative.
  let negative = false;
  if (/^\(.*\)$/.test(value)) {
    negative = true;
    value = value.slice(1, -1);
  }
  if (value.startsWith("-")) {
    negative = true;
    value = value.slice(1);
  }
  if (value.startsWith("+")) value = value.slice(1);

  value = value.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(value)) return null;

  const [whole, frac = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isFinite(cents)) return null;

  return negative ? -cents : cents;
}

export type ParsedRow = {
  occurred_on: string;
  note: string;
  /** Positive cents. Direction is carried separately. */
  amount_minor: number;
  direction: "in" | "out";
};

/**
 * Turns raw rows into entries.
 *
 * `flipSign` exists because the sign convention genuinely differs: a checking
 * export usually has purchases negative, while some card exports list charges
 * as positive. Getting this backwards turns every expense into income, so it's
 * a visible toggle with a preview rather than something inferred silently.
 */
export function toEntries(
  rows: string[][],
  columns: ColumnGuess,
  flipSign: boolean
): { rows: ParsedRow[]; skipped: number } {
  const out: ParsedRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    const occurredOn = parseBankDate(row[columns.date] ?? "");
    if (!occurredOn) {
      skipped++;
      continue;
    }

    let cents: number | null = null;
    if (columns.debit >= 0 || columns.credit >= 0) {
      // Split debit/credit columns: whichever one has a value wins, with debit
      // meaning money out.
      const debit = columns.debit >= 0 ? parseBankAmount(row[columns.debit] ?? "") : null;
      const creditValue = columns.credit >= 0 ? parseBankAmount(row[columns.credit] ?? "") : null;
      if (debit !== null && debit !== 0) cents = -Math.abs(debit);
      else if (creditValue !== null && creditValue !== 0) cents = Math.abs(creditValue);
    }
    if (cents === null) cents = parseBankAmount(row[columns.amount] ?? "");

    if (cents === null || cents === 0) {
      skipped++;
      continue;
    }

    const signed = flipSign ? -cents : cents;
    out.push({
      occurred_on: occurredOn,
      note: (row[columns.description] ?? "").trim().slice(0, 200),
      amount_minor: Math.abs(signed),
      direction: signed < 0 ? "out" : "in",
    });
  }

  return { rows: out, skipped };
}
