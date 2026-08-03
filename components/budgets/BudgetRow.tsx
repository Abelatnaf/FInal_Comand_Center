"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setCategoryBudget } from "@/app/(app)/categories/actions";
import { Amount } from "@/components/money/Amount";
import { colorVar } from "@/lib/categories";
import { fromMinor, formatMoney } from "@/lib/money";

export type BudgetRowData = {
  category_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  monthly_budget_usd_minor: number | null;
  spent_usd_minor: number;
};

export function BudgetRow({ row }: { row: BudgetRowData }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    row.monthly_budget_usd_minor != null ? fromMinor(BigInt(row.monthly_budget_usd_minor)) : ""
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const spent = BigInt(row.spent_usd_minor);
  const budget = row.monthly_budget_usd_minor != null ? BigInt(row.monthly_budget_usd_minor) : null;
  const percent = budget && budget > 0n ? Number((spent * 100n) / budget) : null;
  const remaining = budget != null ? budget - spent : null;

  async function save() {
    setBusy(true);
    setError(null);
    const res = await setCategoryBudget(row.category_id, value);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="row flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="cat-icon" style={{ ["--cat-color" as string]: colorVar(row.color) }} aria-hidden>
          {row.icon ?? "•"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium truncate">{row.name}</p>
          <p className="text-[13px] text-muted num">
            {budget != null ? (
              <>
                {formatMoney(spent, "USD")} of {formatMoney(budget, "USD")}
              </>
            ) : (
              <>{formatMoney(spent, "USD")} spent · no budget</>
            )}
          </p>
        </div>
        {!editing && (
          <button type="button" className="btn btn-ghost text-[13px]" onClick={() => setEditing(true)}>
            {budget != null ? "Edit" : "Set"}
          </button>
        )}
      </div>

      {budget != null && percent != null && (
        <>
          <div className="progress-track">
            <div
              className="progress-fill"
              data-tone={percent > 100 ? "alarm" : percent > 85 ? "urgent" : "positive"}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <p className="text-[13px]">
            {remaining != null && remaining >= 0n ? (
              <span className="text-muted">
                <Amount minor={remaining} currency="USD" /> left
              </span>
            ) : (
              <span className="text-alarm">
                <Amount minor={remaining != null ? -remaining : 0n} currency="USD" /> over
              </span>
            )}
          </p>
        </>
      )}

      {editing && (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              inputMode="decimal"
              placeholder="Monthly budget in USD"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label={`Monthly budget for ${row.name}`}
            />
            <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
              {busy ? "…" : "Save"}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-faint">Leave blank to remove the budget.</p>
            <button type="button" className="btn btn-ghost text-[13px]" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
          {error && <p className="text-alarm text-[13px]">{error}</p>}
        </div>
      )}
    </div>
  );
}
