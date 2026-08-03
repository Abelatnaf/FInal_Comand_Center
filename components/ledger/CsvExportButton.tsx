"use client";

import { downloadCsv } from "@/lib/csv";
import { fromMinor } from "@/lib/money";
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
          "Category",
          "Account",
          "Description",
          "Tags",
          "Tax deductible",
        ];
        const body = rows.map((t) => [
          t.occurred_on,
          t.direction === "out" ? "Spent" : "Received",
          fromMinor(BigInt(t.amount_minor)),
          t.category_name ?? "",
          t.account_name,
          t.note ?? "",
          (t.tags ?? []).join(" "),
          t.is_tax_deductible ? "Yes" : "",
        ]);
        downloadCsv([header, ...body], `ledger-${todayIso()}.csv`);
      }}
    >
      Export CSV
    </button>
  );
}
