import { PageHeader } from "@/components/glass/Glass";
import { StatCard } from "@/components/glass/StatCard";
import { fmtUsd } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function startOfMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function InsightsPage() {
  const supabase = await createClient();

  const [
    { data: settings },
    { data: allTx },
    { data: allIncome },
    { data: categorySpend },
    { data: weeklyRows },
    { data: balanceRow },
    { data: periods },
  ] = await Promise.all([
    supabase.from("settings").select("tracking_start_date").single(),
    supabase.from("transactions").select("amount_usd, necessity, date"),
    supabase.from("income").select("amount_usd"),
    supabase.from("life_to_date_spend_by_category").select("*").order("total", { ascending: false }),
    supabase.from("weekly_rollup").select("week_number, total_expenses").order("total_expenses", { ascending: false }),
    supabase.from("account_balance").select("current_balance").single(),
    supabase.from("semesters").select("name, end_date").order("end_date", { ascending: false }).limit(1),
  ]);

  const totalSpend = (allTx ?? []).reduce((s, t) => s + (t.amount_usd ?? 0), 0);
  const totalIncome = (allIncome ?? []).reduce((s, i) => s + (i.amount_usd ?? 0), 0);
  const net = totalIncome - totalSpend;
  const discretionarySpend = (allTx ?? [])
    .filter((t) => t.necessity === "Discretionary")
    .reduce((s, t) => s + (t.amount_usd ?? 0), 0);
  const discretionaryShare = totalSpend > 0 ? (discretionarySpend / totalSpend) * 100 : 0;

  const now = new Date();
  const trackingStartDate = settings?.tracking_start_date ? new Date(settings.tracking_start_date) : null;
  const daysSinceStart = trackingStartDate
    ? Math.floor((now.getTime() - trackingStartDate.getTime()) / 86400000)
    : 0;
  const daysElapsed = Math.max(1, daysSinceStart);
  const avgDailySpend = totalSpend / daysElapsed;
  const avgWeeklySpend = avgDailySpend * 7;
  const avgWeeklyNet = (net / daysElapsed) * 7;

  const topCategory = categorySpend?.find((c) => (c.total ?? 0) > 0) ?? null;
  const topWeek = weeklyRows?.find((w) => (w.total_expenses ?? 0) > 0) ?? null;

  const thisMonthStart = startOfMonth(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStart = startOfMonth(lastMonthDate);
  const thisMonthSpend = (allTx ?? [])
    .filter((t) => t.date >= thisMonthStart)
    .reduce((s, t) => s + (t.amount_usd ?? 0), 0);
  const lastMonthSpend = (allTx ?? [])
    .filter((t) => t.date >= lastMonthStart && t.date < thisMonthStart)
    .reduce((s, t) => s + (t.amount_usd ?? 0), 0);
  const momChange = lastMonthSpend > 0 ? ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100 : 0;

  const lastPeriod = periods?.[0];
  const weeksRemaining = lastPeriod
    ? Math.max(0, (new Date(lastPeriod.end_date).getTime() - now.getTime()) / (7 * 86400000))
    : 0;
  const currentBalance = balanceRow?.current_balance ?? 0;
  const projectedBalance = currentBalance + avgWeeklyNet * weeksRemaining;

  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle="Life-to-date totals — all computed, no manual entry."
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Logged Spend (Life-to-Date)" value={fmtUsd(totalSpend)} size="small" />
        <StatCard label="Total Logged Income (Life-to-Date)" value={fmtUsd(totalIncome)} size="small" />
        <StatCard label="Net (Life-to-Date)" value={fmtUsd(net)} size="small" />
        <StatCard label="Days Since Start" value={String(daysSinceStart)} size="small" />
        <StatCard label="Avg Daily Spend" value={fmtUsd(avgDailySpend)} size="small" />
        <StatCard label="Avg Weekly Spend" value={fmtUsd(avgWeeklySpend)} size="small" />
        <StatCard label="Discretionary Share of Spend" value={`${discretionaryShare.toFixed(0)}%`} size="small" />
        <StatCard
          label="Highest Spend Category (Life-to-Date)"
          value={topCategory?.category ?? "—"}
          delta={topCategory ? fmtUsd(topCategory.total ?? 0) : undefined}
          size="small"
        />
        <StatCard
          label="Highest Spend Week"
          value={topWeek ? `Week ${topWeek.week_number}` : "—"}
          delta={topWeek ? fmtUsd(topWeek.total_expenses ?? 0) : undefined}
          size="small"
        />
        <StatCard label="This Month Spend" value={fmtUsd(thisMonthSpend)} size="small" />
        <StatCard label="Last Month Spend" value={fmtUsd(lastMonthSpend)} size="small" />
        <StatCard label="Month-over-Month Change" value={`${momChange >= 0 ? "↑" : "↓"} ${Math.abs(momChange).toFixed(0)}%`} size="small" />
        {lastPeriod && (
          <StatCard
            label={`Weeks Remaining Until ${lastPeriod.name} Ends`}
            value={weeksRemaining.toFixed(1)}
            size="small"
          />
        )}
        {lastPeriod && (
          <StatCard
            label={`Projected Balance — End of ${lastPeriod.name}`}
            value={fmtUsd(projectedBalance)}
            size="small"
          />
        )}
      </div>
    </div>
  );
}
