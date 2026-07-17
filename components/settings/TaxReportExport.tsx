"use client";

import { Glass } from "@/components/glass/Glass";
import { downloadCsv } from "@/lib/csv";

type CategoryRow = { name: string; total: number };
type DeductibleRow = { date: string; description: string; category: string; split: boolean; amount: number };

export function TaxReportExport({
  year,
  categoryRows,
  deductibleRows,
}: {
  year: string;
  categoryRows: CategoryRow[];
  deductibleRows: DeductibleRow[];
}) {
  function exportSummary() {
    const header = ["Category", `${year} Total`];
    const rows = categoryRows.map((c) => [c.name, c.total.toFixed(2)]);
    downloadCsv([header, ...rows], `tax-report-${year}-by-category.csv`);
  }

  function exportDeductible() {
    const header = ["Date", "Description", "Category", "Split Across Categories", "Amount (USD)"];
    const rows = deductibleRows.map((t) => [t.date, t.description, t.category, t.split ? "Yes" : "No", t.amount.toFixed(2)]);
    downloadCsv([header, ...rows], `tax-report-${year}-deductible.csv`);
  }

  return (
    <Glass className="p-4 flex flex-wrap items-center gap-3">
      <span className="ios-subhead text-text-dim">Export {year}:</span>
      <button onClick={exportSummary} disabled={categoryRows.length === 0} className="btn text-sm">
        Category Summary (CSV)
      </button>
      <button onClick={exportDeductible} disabled={deductibleRows.length === 0} className="btn text-sm">
        Deductible Transactions (CSV)
      </button>
    </Glass>
  );
}
