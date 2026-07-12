"use client";

import { useActionState, useState } from "react";
import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";
import { updateCategoryBudgets } from "@/app/(app)/settings/actions";

type Cat = { id: number; name: string; monthly_budget: number };

export function CategoryBudgetsForm({ categories }: { categories: Cat[] }) {
  const [state, formAction, pending] = useActionState(updateCategoryBudgets, undefined);
  const [values, setValues] = useState<Record<number, string>>(
    Object.fromEntries(categories.map((c) => [c.id, String(c.monthly_budget)]))
  );

  const total = categories.reduce((s, c) => s + (parseFloat(values[c.id]) || 0), 0);

  return (
    <Glass className="p-6 max-w-xl">
      <div className="ios-headline mb-1">Category Budgets</div>
      <p className="text-text-dim ios-subhead mb-4">
        Monthly spending target per category — powers Budget vs Actual on the Command Deck.
      </p>

      <form action={formAction} className="flex flex-col">
        {categories.map((c, i) => (
          <div
            key={c.id}
            className={`flex items-center justify-between gap-3 py-2.5 ${i > 0 ? "border-t border-[var(--separator)]" : ""}`}
          >
            <label htmlFor={`b_${c.id}`} className="ios-body">
              {c.name}
            </label>
            <div className="flex items-center gap-1 w-32">
              <span className="text-text-dim">$</span>
              <input
                id={`b_${c.id}`}
                name={`budget_${c.id}`}
                type="number"
                step="0.01"
                min="0"
                value={values[c.id]}
                onChange={(e) => setValues((v) => ({ ...v, [c.id]: e.target.value }))}
                className="input !py-1.5 !px-2 text-sm num w-full text-right"
              />
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between border-t border-[var(--separator-strong)] pt-3 mt-1">
          <span className="ios-headline">Total / month</span>
          <span className="num ios-headline">{fmtUsd(total)}</span>
        </div>

        {state?.error && <p className="text-text-dim text-sm mt-2">{state.error}</p>}
        {state?.success && <p className="text-text-dim text-sm mt-2">Saved.</p>}

        <button disabled={pending} type="submit" className="btn btn-primary mt-4 self-start">
          {pending ? "Saving…" : "Save Budgets"}
        </button>
      </form>
    </Glass>
  );
}
