"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createMealPlan,
  logSwipe,
  undoLastSwipe,
  deleteMealPlan,
  type MealState,
} from "@/app/(app)/meal-plan/actions";
import { Amount } from "@/components/money/Amount";

export type MealPlanRow = {
  meal_plan_id: string;
  name: string;
  swipes_total: number | null;
  swipes_used: number;
  swipes_remaining: number | null;
  dining_minor: number;
  days_remaining: number;
  weeks_remaining: number;
};

type Term = { id: string; name: string };
type Account = { id: string; name: string };

export function MealPlanManager({
  plans,
  terms,
  mealAccounts,
}: {
  plans: MealPlanRow[];
  terms: Term[];
  mealAccounts: Account[];
}) {
  const [adding, setAdding] = useState(plans.length === 0);
  const [state, formAction, pending] = useActionState<MealState, FormData>(createMealPlan, undefined);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setAdding(false);
  }, [state]);

  return (
    <div className="flex flex-col gap-5">
      {plans.map((p) => {
        const perWeek =
          p.swipes_remaining != null && p.weeks_remaining > 0
            ? Math.floor(p.swipes_remaining / p.weeks_remaining)
            : null;
        const perDayDining =
          p.days_remaining > 0 ? BigInt(p.dining_minor) / BigInt(p.days_remaining) : null;

        return (
          <div key={p.meal_plan_id} className="card">
            <div className="row">
              <p className="section-label mb-2">{p.name}</p>

              {p.swipes_remaining != null && (
                <>
                  <p className="hero-figure num">{p.swipes_remaining}</p>
                  <p className="text-[14px] text-muted mt-1">
                    swipes left of {p.swipes_total} · {p.weeks_remaining}{" "}
                    {p.weeks_remaining === 1 ? "week" : "weeks"} to go
                  </p>
                  {perWeek !== null && (
                    <p className="text-[14px] text-muted mt-1">
                      That&rsquo;s <strong className="text-text num">{perWeek}</strong> a week — about{" "}
                      {Math.floor(perWeek / 7)} a day.
                    </p>
                  )}
                  <div className="progress-track mt-3">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${
                          p.swipes_total ? Math.min((p.swipes_used / p.swipes_total) * 100, 100) : 0
                        }%`,
                      }}
                    />
                  </div>
                </>
              )}

              {BigInt(p.dining_minor) > 0n && (
                <div className="mt-4 pt-4 border-t flex gap-6">
                  <div>
                    <p className="section-label">Dining dollars</p>
                    <Amount minor={BigInt(p.dining_minor)} className="text-[17px] font-semibold" />
                  </div>
                  {perDayDining !== null && (
                    <div>
                      <p className="section-label">Safe a day</p>
                      <Amount minor={perDayDining} className="text-[17px] font-semibold" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {p.swipes_total != null && (
              <div className="row flex gap-2">
                <button
                  type="button"
                  className="btn btn-primary flex-1"
                  disabled={busy}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await logSwipe(p.meal_plan_id);
                      if (res.error) setError(res.error);
                      router.refresh();
                    })
                  }
                >
                  Used a swipe
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await undoLastSwipe(p.meal_plan_id);
                      if (res.error) setError(res.error);
                      router.refresh();
                    })
                  }
                >
                  Undo
                </button>
              </div>
            )}

            <div className="row">
              <button
                type="button"
                className="text-alarm text-[13px]"
                disabled={busy}
                onClick={() =>
                  startTransition(async () => {
                    await deleteMealPlan(p.meal_plan_id);
                    router.refresh();
                  })
                }
              >
                Remove this plan
              </button>
            </div>
          </div>
        );
      })}

      {error && <p className="text-alarm text-[14px]">{error}</p>}

      {terms.length === 0 ? (
        <div className="card row flex flex-col gap-3">
          <p className="text-[15px] text-text">Add a term first.</p>
          <p className="text-[14px] text-muted">
            A meal plan runs for a semester, so it needs to know which one.
          </p>
          <Link href="/semesters" className="btn btn-primary self-start">
            Add a term
          </Link>
        </div>
      ) : (
        <div className="card">
          <div className="row flex items-center justify-between gap-3">
            <p className="section-label">{plans.length > 0 ? "Add another plan" : "Set up your plan"}</p>
            {!adding && (
              <button type="button" className="text-accent text-[13px]" onClick={() => setAdding(true)}>
                Add
              </button>
            )}
          </div>

          {adding && (
            <form action={formAction} className="row flex flex-col gap-2">
              <input name="name" placeholder="Block 200" className="input" aria-label="Plan name" />
              <select name="term_id" className="input" aria-label="Term" required>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <input
                name="swipes_total"
                inputMode="numeric"
                placeholder="Swipes for the term (optional)"
                className="input num"
              />
              <select name="account_id" className="input" aria-label="Dining dollars account">
                <option value="">No dining dollars</option>
                {mealAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <p className="text-[12px] text-faint">
                Dining dollars live in a &ldquo;Meal plan&rdquo; account, so spending them shows up in your
                ledger like anything else. Add one in Settings first if you don&rsquo;t have it.
              </p>
              {state?.error && <p className="text-alarm text-[13px]">{state.error}</p>}
              <div className="flex gap-2">
                {plans.length > 0 && (
                  <button type="button" className="btn flex-1" onClick={() => setAdding(false)}>
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={pending} className="btn btn-primary flex-1">
                  {pending ? "Saving…" : "Save plan"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
