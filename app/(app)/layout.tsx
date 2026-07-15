import { AppShell } from "@/components/nav/AppShell";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";
import type { Alert } from "@/components/AlertsBanner";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [
    { data: categories },
    { data: userData },
    { data: accounts },
    { data: currencies },
    { data: budgetRows },
    { data: balanceRow },
    { data: settingsRow },
    { data: bills },
  ] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.auth.getUser(),
    supabase.from("accounts").select("id, name").order("sort_order"),
    supabase.from("currencies").select("code, name, rate_to_usd").order("code"),
    supabase.from("budget_vs_actual_this_month").select("category, budget, actual"),
    supabase.from("account_balance").select("current_balance").single(),
    supabase.from("settings").select("low_balance_threshold").single(),
    supabase.from("recurring_bills").select("id, name, monthly_cost_usd, billing_day").eq("active", true),
  ]);

  const alerts: Alert[] = [];

  for (const row of budgetRows ?? []) {
    if ((row.budget ?? 0) > 0 && (row.actual ?? 0) > (row.budget ?? 0)) {
      const over = (row.actual ?? 0) - (row.budget ?? 0);
      alerts.push({
        id: `budget-${row.category}`,
        message: `You're $${over.toFixed(2)} over budget in ${row.category} this month.`,
        href: "/",
      });
    }
  }

  const threshold = settingsRow?.low_balance_threshold;
  const currentBalance = balanceRow?.current_balance ?? 0;
  if (threshold != null && currentBalance < threshold) {
    alerts.push({
      id: "low-balance",
      message: `Your balance ($${currentBalance.toFixed(2)}) is below your $${threshold.toFixed(2)} alert threshold.`,
      href: "/net-worth",
    });
  }

  const now = new Date();
  const today = now.getDate();
  for (const bill of bills ?? []) {
    if (!bill.billing_day) continue;
    const daysUntil =
      bill.billing_day >= today
        ? bill.billing_day - today
        : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - today + bill.billing_day;
    if (daysUntil <= 1) {
      alerts.push({
        id: `bill-${bill.id}`,
        message: `${bill.name} ($${bill.monthly_cost_usd.toFixed(2)}) is due ${daysUntil === 0 ? "today" : "tomorrow"}.`,
        href: "/recurring-bills",
      });
    }
  }

  return (
    <AppShell
      onSignOut={signOut}
      categories={categories ?? []}
      currencies={currencies ?? []}
      email={userData?.user?.email ?? null}
      accounts={accounts ?? []}
      alerts={alerts}
    >
      {children}
    </AppShell>
  );
}
