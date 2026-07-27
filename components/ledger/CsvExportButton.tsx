"use client";

import { downloadCsv } from "@/lib/csv";
import { fromMinor, type Currency } from "@/lib/money";
import { todayIso } from "@/lib/date";
import type { TransactionRowData } from "@/components/ledger/TransactionRow";

export function CsvExportButton({ rows }: { rows: TransactionRowData[] }) {
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        const header = [
          "Date",
          "Direction",
          "Amount",
          "Currency",
          "Amount (USD)",
          "Category",
          "Payer",
          "Account",
          "Note",
        ];
        const body = rows.map((t) => [
          t.occurred_on,
          t.direction,
          fromMinor(BigInt(t.amount_minor)),
          t.currency as Currency,
          fromMinor(BigInt(t.amount_usd_minor)),
          t.category ?? "",
          t.payer_label,
          t.account_name,
          t.note ?? "",
        ]);
        downloadCsv([header, ...body], `ledger-${todayIso()}.csv`);
      }}
    >
      Export CSV
    </button>
  );
}
