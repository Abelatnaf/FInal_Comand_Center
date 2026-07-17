import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// The cron routes use the service-role client, which bypasses RLS entirely.
// Several of this app's views (account_balance, budget_vs_actual_this_month,
// etc.) are security_invoker with no explicit user_id filter — they rely on
// RLS to scope themselves to "whoever is asking." Querying them through the
// service-role client would silently sum every user's data into one number,
// not per-user. So these helpers replicate the same formulas as plain
// queries against the base tables, with an explicit .eq("user_id", …) —
// verified against each view's real pg_get_viewdef output before writing
// this, not assumed from the view names.

export async function computeCurrentBalance(supabase: SupabaseClient<Database>, userId: string): Promise<number> {
  const [{ data: accounts }, { data: income }, { data: tx }] = await Promise.all([
    supabase.from("accounts").select("starting_balance, kind").eq("user_id", userId),
    supabase.from("income").select("amount_usd").eq("user_id", userId),
    supabase.from("transactions").select("amount_usd").eq("user_id", userId),
  ]);
  const startingTotal = (accounts ?? []).reduce(
    (s, a) => s + (a.kind === "liability" ? -a.starting_balance : a.starting_balance),
    0
  );
  const totalIncome = (income ?? []).reduce((s, i) => s + (i.amount_usd ?? 0), 0);
  const totalExpenses = (tx ?? []).reduce((s, t) => s + (t.amount_usd ?? 0), 0);
  return startingTotal + totalIncome - totalExpenses;
}

export async function computeBudgetVsActualThisMonth(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ category: string; budget: number; actual: number }[]> {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data: categories }, { data: breakdown }] = await Promise.all([
    supabase.from("categories").select("id, name, monthly_budget").eq("user_id", userId),
    supabase
      .from("transaction_category_breakdown")
      .select("category_id, amount_usd")
      .eq("user_id", userId)
      .gte("date", monthStart)
      .lt("date", monthEnd),
  ]);

  const actualByCategory = new Map<number, number>();
  for (const row of breakdown ?? []) {
    if (row.category_id == null) continue;
    actualByCategory.set(row.category_id, (actualByCategory.get(row.category_id) ?? 0) + (row.amount_usd ?? 0));
  }

  return (categories ?? []).map((c) => ({
    category: c.name,
    budget: c.monthly_budget ?? 0,
    actual: actualByCategory.get(c.id) ?? 0,
  }));
}
