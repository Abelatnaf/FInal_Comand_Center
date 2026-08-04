"use client";

import { useState } from "react";
import { Amount } from "@/components/money/Amount";
import type { TransactionRowData } from "@/components/ledger/TransactionRow";

/**
 * Per-category totals for the currently filtered set, grouped by month.
 * Deliberately rows and numbers only -- the spec bans charts and dashboards,
 * and a sorted list answers "where did it go" without either.
 *
 * Totals are in USD because that's the only figure comparable across the two
 * currencies, and it's the frozen per-transaction value -- never a live
 * re-conversion -- so these numbers don't move when today's rate does.
 */
export function LedgerSummary({ rows }: { rows: TransactionRowData[] }) {
  const [open, setOpen] = useState(false);

  if (rows.length === 0) return null;

  const byMonth = new Map<string, Map<string, bigint>>();
  for (const r of rows) {
    if (r.direction !== "out") continue;
    const month = r.occurred_on.slice(0, 7);
    const category = r.category_name ?? "Uncategorized";
    if (!byMonth.has(month)) byMonth.set(month, new Map());
    const cats = byMonth.get(month)!;
    cats.set(category, (cats.get(category) ?? 0n) + BigInt(r.amount_minor));
  }

  if (byMonth.size === 0) return null;

  const months = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="row w-full text-left flex items-center justify-between gap-3"
      >
        <p className="section-label">Spending by category</p>
        <span className="text-muted text-[13px]">{open ? "Hide" : "Show"}</span>
      </button>

      {open &&
        months.map(([month, cats]) => {
          const total = [...cats.values()].reduce((sum, v) => sum + v, 0n);
          const ranked = [...cats.entries()].sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0));
          return (
            <div key={month} className="row flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[14px] text-text font-medium">{formatMonth(month)}</p>
                <Amount minor={total} className="text-text text-[14px]" />
              </div>
              {ranked.map(([category, minor]) => (
                <div key={category} className="flex items-center justify-between text-[13px]">
                  <span className="text-muted truncate">{category}</span>
                  <Amount minor={minor} className="text-muted shrink-0" />
                </div>
              ))}
            </div>
          );
        })}
    </div>
  );
}

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
