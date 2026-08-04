"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addCategoryRule,
  deleteCategoryRule,
  applyRulesToUncategorized,
  type ActionState,
} from "@/app/(app)/settings/actions";
import type { Category } from "@/lib/categories";

export type CategoryRule = {
  id: string;
  match_text: string;
  category_id: string;
};

export function CategoryRulesForm({
  rules,
  categories,
}: {
  rules: CategoryRule[];
  categories: Category[];
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addCategoryRule, undefined);
  const [busy, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  const nameFor = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";
  const iconFor = (id: string) => categories.find((c) => c.id === id)?.icon ?? "•";

  return (
    <div className="card">
      <div className="row">
        <p className="section-label mb-1">Auto-categorize</p>
        <p className="text-[13px] text-muted">
          When a description contains this text, file it here automatically. Rules run on everything —
          typed entries, imported bank rows, and recurring charges.
        </p>
      </div>

      {rules.map((r) => (
        <div key={r.id} className="row flex items-center justify-between gap-3">
          <p className="text-[15px] min-w-0 truncate">
            <span className="text-muted">“{r.match_text}”</span> → {iconFor(r.category_id)}{" "}
            {nameFor(r.category_id)}
          </p>
          <button
            type="button"
            className="text-alarm text-[13px] shrink-0"
            disabled={busy}
            onClick={() =>
              startTransition(async () => {
                await deleteCategoryRule(r.id);
                router.refresh();
              })
            }
          >
            Delete
          </button>
        </div>
      ))}

      {rules.length === 0 && (
        <p className="row text-[14px] text-muted">
          No rules yet. A good first one: “Starbucks” → Dining Out.
        </p>
      )}

      <form action={formAction} className="row flex flex-col gap-2">
        <input
          name="match_text"
          placeholder="Text in the description, e.g. TRADER JOE"
          className="input"
          aria-label="Text to match"
          required
        />
        <select name="category_id" className="input" aria-label="Category" required defaultValue="">
          <option value="" disabled>
            File it under…
          </option>
          {categories
            .filter((c) => !c.is_archived)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
        </select>
        {state?.error && <p className="text-alarm text-[13px]">{state.error}</p>}
        <button type="submit" disabled={pending} className="btn">
          {pending ? "Adding…" : "Add rule"}
        </button>
      </form>

      {rules.length > 0 && (
        <div className="row flex flex-col gap-2">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() =>
              startTransition(async () => {
                const res = await applyRulesToUncategorized();
                setNotice(
                  res.error
                    ? res.error
                    : res.updated === 0
                      ? "Nothing left to categorize."
                      : `Filed ${res.updated} ${res.updated === 1 ? "entry" : "entries"}.`
                );
                router.refresh();
              })
            }
          >
            {busy ? "Working…" : "Apply rules to uncategorized entries"}
          </button>
          {notice && <p className="text-[13px] text-muted">{notice}</p>}
        </div>
      )}
    </div>
  );
}
