import { PageHeader } from "@/components/glass/Glass";
import { ForecastPanel } from "@/components/dashboard/ForecastPanel";
import { createClient } from "@/lib/supabase/server";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function ForecastPage() {
  const supabase = await createClient();
  const now = new Date();

  // Trailing window for the "other" (non-recurring) average pace — 90 days,
  // or however much history actually exists if less than that.
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 90);
  const windowStartStr = windowStart.toISOString().slice(0, 10);

  const [{ data: balanceRow }, { data: bills }, { data: incomeRules }, { data: settings }, { data: windowTx }, { data: windowIncome }] =
    await Promise.all([
      supabase.from("account_balance").select("current_balance").single(),
      supabase.from("recurring_bills").select("monthly_cost_usd").eq("active", true),
      supabase.from("recurring_income").select("amount_usd").eq("active", true),
      supabase.from("settings").select("tracking_start_date").single(),
      supabase.from("transactions").select("amount_usd, is_recurring, date").gte("date", windowStartStr),
      supabase.from("income").select("amount_usd, notes, date").gte("date", windowStartStr),
    ]);

  const currentBalance = balanceRow?.current_balance ?? 0;
  const recurringBillsMonthly = (bills ?? []).reduce((s, b) => s + (b.monthly_cost_usd ?? 0), 0);
  const recurringIncomeMonthly = (incomeRules ?? []).reduce((s, r) => s + (r.amount_usd ?? 0), 0);

  const otherExpenses = (windowTx ?? [])
    .filter((t) => !t.is_recurring)
    .reduce((s, t) => s + (t.amount_usd ?? 0), 0);
  const otherIncome = (windowIncome ?? [])
    .filter((i) => i.notes !== "Auto-posted recurring income")
    .reduce((s, i) => s + (i.amount_usd ?? 0), 0);

  const trackingStart = settings?.tracking_start_date ? new Date(settings.tracking_start_date) : windowStart;
  const effectiveWindowStart = trackingStart > windowStart ? trackingStart : windowStart;
  const daysInWindow = Math.max(1, Math.round((now.getTime() - effectiveWindowStart.getTime()) / 86400000));
  const avgDailyOtherNet = (otherIncome - otherExpenses) / daysInWindow;

  const months = Array.from({ length: 12 }, (_, i) => {
    const target = new Date(now.getFullYear(), now.getMonth() + i + 1, 0); // end of month i+1 from now
    const daysFromToday = Math.round((target.getTime() - now.getTime()) / 86400000);
    return { label: `${MONTH_NAMES[target.getMonth()]} ${target.getFullYear()}`, daysFromToday };
  });

  return (
    <div>
      <PageHeader
        title="Forecast"
        subtitle="Project your balance 3–12 months out from recurring flows and recent spending pace, then try what-if scenarios."
      />
      <ForecastPanel
        currentBalance={currentBalance}
        avgDailyOtherNet={avgDailyOtherNet}
        recurringIncomeMonthly={recurringIncomeMonthly}
        recurringBillsMonthly={recurringBillsMonthly}
        months={months}
      />
    </div>
  );
}
