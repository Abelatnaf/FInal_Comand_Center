"use client";

import { downloadCsv } from "@/lib/csv";
import { fromMinor } from "@/lib/money";
import { todayIso } from "@/lib/date";

export type BillExportRow = {
  title: string;
  payer_label: string;
  status: string;
  due_on: string | null;
  amount_usd_minor: number;
  amount_paid_usd_minor: number;
  amount_remaining_usd_minor: number;
};

/** Exports whatever is currently filtered, matching the Ledger's behaviour. */
export function BillsExportButton({ rows }: { rows: BillExportRow[] }) {
  return (
    <button
      type="button"
      className="text-accent text-[14px]"
      onClick={() => {
        const header = ["Title", "Payer", "Status", "Due", "Total USD", "Paid USD", "Remaining USD"];
        const body = rows.map((r) => [
          r.title,
          r.payer_label,
          r.status,
          r.due_on ?? "",
          fromMinor(BigInt(r.amount_usd_minor)),
          fromMinor(BigInt(r.amount_paid_usd_minor)),
          fromMinor(BigInt(r.amount_remaining_usd_minor)),
        ]);
        downloadCsv([header, ...body], `bills-${todayIso()}.csv`);
      }}
    >
      Export
    </button>
  );
}
