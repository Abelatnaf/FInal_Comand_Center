"use client";

import { useState, useTransition } from "react";
import { fmtMoney } from "@/lib/format";
import { updateCategoryBudget, logRecurringNow } from "@/app/(app)/budgets/actions";

export type BudgetRow = { category_id: string; name: string; monthly_budget: number; actual_spent: number };
export type RecurringItem = {
  id: string;
  type: string;
  description: string;
  amount: number;
  category_name: string | null;
  loggedThisMonth: boolean;
};

export function CategoryBudgetRow({ row, currency }: { row: BudgetRow; currency: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const pct = row.monthly_budget > 0 ? Math.min(100, (row.actual_spent / row.monthly_budget) * 100) : 0;
  const over = row.monthly_budget > 0 && row.actual_spent > row.monthly_budget;

  return (
    <div className="py-3 border-t border-[var(--separator)] first:border-t-0">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="ios-body truncate">{row.name}</div>
        {editing ? (
          <form
            action={(formData) => {
              startTransition(() => updateCategoryBudget(row.category_id, formData));
              setEditing(false);
            }}
            className="flex items-center gap-1.5"
          >
            <input
              name="monthlyBudget"
              type="number"
              step="1"
              min="0"
              defaultValue={row.monthly_budget}
              autoFocus
              className="input !py-1 !px-2 text-sm w-24"
              onBlur={(e) => e.currentTarget.form?.requestSubmit()}
            />
          </form>
        ) : (
          <button onClick={() => setEditing(true)} className="ios-footnote text-text-dim shrink-0">
            {fmtMoney(row.actual_spent, currency)} / {row.monthly_budget > 0 ? fmtMoney(row.monthly_budget, currency) : "Set budget"}
          </button>
        )}
      </div>
      {row.monthly_budget > 0 && (
        <div className="liquid-track">
          <div
            className="liquid-fill"
            style={{ width: `${pct}%`, background: over ? "var(--red)" : "var(--blue)", opacity: pending ? 0.5 : 1 }}
          />
        </div>
      )}
    </div>
  );
}

export function RecurringRow({ item, currency }: { item: RecurringItem; currency: string }) {
  const [pending, startTransition] = useTransition();
  const [logged, setLogged] = useState(item.loggedThisMonth);

  return (
    <div className="flex items-center justify-between py-2.5 border-t border-[var(--separator)] first:border-t-0 gap-3">
      <div className="min-w-0">
        <div className="ios-body truncate">{item.description}</div>
        <div className="ios-footnote text-text-dim">{item.category_name ?? (item.type === "income" ? "Income" : "Expense")}</div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className={`num ios-headline ${item.type === "income" ? "pos" : "neg"}`}>
          {item.type === "income" ? "+" : "−"}
          {fmtMoney(item.amount, currency)}
        </div>
        {logged ? (
          <span className="badge !text-[11px]">Logged</span>
        ) : (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await logRecurringNow(item.id);
                setLogged(true);
              })
            }
            className="btn text-[13px] !py-1.5 !px-3"
          >
            Log this month
          </button>
        )}
      </div>
    </div>
  );
}
