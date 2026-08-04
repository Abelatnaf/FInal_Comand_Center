import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseCsv,
  findHeaderRow,
  guessColumns,
  parseBankDate,
  parseBankAmount,
  toEntries,
} from "./bank-csv.ts";

test("parseCsv handles quoted fields, embedded commas and doubled quotes", () => {
  const rows = parseCsv('a,b\n"x, y","he said ""hi"""\n');
  assert.deepEqual(rows, [
    ["a", "b"],
    ["x, y", 'he said "hi"'],
  ]);
});

test("parseCsv treats CRLF as one row break and drops blank lines", () => {
  const rows = parseCsv("a,b\r\n1,2\r\n\r\n3,4");
  assert.deepEqual(rows, [
    ["a", "b"],
    ["1", "2"],
    ["3", "4"],
  ]);
});

test("parseCsv strips the BOM Excel prepends, so the first header still matches", () => {
  const rows = parseCsv("﻿Date,Amount\n01/02/2026,-5.00");
  assert.equal(rows[0][0], "Date");
});

test("findHeaderRow skips a bank's summary preamble", () => {
  // Bank of America's checking export leads with several non-tabular lines.
  const rows = parseCsv(
    [
      "Description,,Summary Amt.",
      "Beginning balance as of 01/01/2026,,1000.00",
      "",
      "Date,Description,Amount,Running Bal.",
      "01/02/2026,STARBUCKS,-5.00,995.00",
    ].join("\n")
  );
  assert.equal(findHeaderRow(rows), 2);
  assert.equal(rows[findHeaderRow(rows)][0], "Date");
});

test("guessColumns finds a checking export's columns and ignores running balance", () => {
  const c = guessColumns(["Date", "Description", "Amount", "Running Bal."]);
  assert.equal(c.date, 0);
  assert.equal(c.description, 1);
  assert.equal(c.amount, 2);
});

test("guessColumns handles a credit-card export's different header names", () => {
  const c = guessColumns(["Posted Date", "Reference Number", "Payee", "Address", "Amount"]);
  assert.equal(c.date, 0);
  assert.equal(c.description, 2);
  assert.equal(c.amount, 4);
});

test("guessColumns picks up separate Debit and Credit columns", () => {
  const c = guessColumns(["Transaction Date", "Description", "Category", "Debit", "Credit"]);
  assert.equal(c.debit, 3);
  assert.equal(c.credit, 4);
});

test("parseBankDate reads US and ISO formats, and two-digit years", () => {
  assert.equal(parseBankDate("01/02/2026"), "2026-01-02");
  assert.equal(parseBankDate("1/2/2026"), "2026-01-02");
  assert.equal(parseBankDate("2026-01-02"), "2026-01-02");
  assert.equal(parseBankDate("01/02/26"), "2026-01-02");
});

test("parseBankDate refuses anything it can't read rather than guessing", () => {
  // A misread date silently files a purchase in the wrong month, so a header
  // row or a footer line has to come back null, not a plausible-looking date.
  assert.equal(parseBankDate("Date"), null);
  assert.equal(parseBankDate(""), null);
  assert.equal(parseBankDate("13/45/2026"), null);
});

test("parseBankAmount handles currency symbols, thousands and both negative styles", () => {
  assert.equal(parseBankAmount("-45.20"), -4520);
  assert.equal(parseBankAmount("(45.20)"), -4520);
  assert.equal(parseBankAmount("$1,234.56"), 123456);
  assert.equal(parseBankAmount("+12.00"), 1200);
  assert.equal(parseBankAmount("5"), 500);
});

test("parseBankAmount returns null for non-numeric cells", () => {
  assert.equal(parseBankAmount("Amount"), null);
  assert.equal(parseBankAmount(""), null);
  assert.equal(parseBankAmount("--"), null);
});

test("toEntries maps sign to direction and skips unreadable rows", () => {
  const rows = [
    ["01/02/2026", "STARBUCKS", "-5.00"],
    ["01/03/2026", "PAYCHECK", "2500.00"],
    ["not a date", "JUNK", "1.00"],
    ["01/04/2026", "ZERO", "0.00"],
  ];
  const { rows: out, skipped } = toEntries(rows, { date: 0, description: 1, amount: 2, debit: -1, credit: -1 }, false);

  assert.equal(out.length, 2);
  assert.equal(skipped, 2); // the bad date and the zero-amount row
  assert.deepEqual(out[0], {
    occurred_on: "2026-01-02",
    note: "STARBUCKS",
    amount_minor: 500,
    direction: "out",
  });
  assert.equal(out[1].direction, "in");
});

test("toEntries flipSign reverses direction without changing the amount", () => {
  const rows = [["01/02/2026", "CHARGE", "5.00"]];
  const columns = { date: 0, description: 1, amount: 2, debit: -1, credit: -1 };

  const normal = toEntries(rows, columns, false).rows[0];
  const flipped = toEntries(rows, columns, true).rows[0];

  assert.equal(normal.direction, "in");
  assert.equal(flipped.direction, "out");
  assert.equal(normal.amount_minor, flipped.amount_minor);
});

test("toEntries reads split Debit/Credit columns, debit meaning money out", () => {
  const rows = [
    ["01/02/2026", "GROCERIES", "", "82.14", ""],
    ["01/05/2026", "REFUND", "", "", "20.00"],
  ];
  const { rows: out } = toEntries(
    rows,
    { date: 0, description: 1, amount: 2, debit: 3, credit: 4 },
    false
  );

  assert.equal(out.length, 2);
  assert.equal(out[0].direction, "out");
  assert.equal(out[0].amount_minor, 8214);
  assert.equal(out[1].direction, "in");
  assert.equal(out[1].amount_minor, 2000);
});
