import { PageHeader, Glass } from "@/components/glass/Glass";
import { StatCard } from "@/components/glass/StatCard";
import { YearOverYearChart, type YearOverYearPoint } from "@/components/charts/YearOverYearChart";
import { fmtUsd } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
    { data: activeBills },
  ] = await Promise.all([
    supabase.from("settings").select("tracking_start_date").single(),
    supabase.from("transactions").select("amount_usd, necessity, date"),
    supabase.from("income").select("amount_usd, date"),
    supabase.from("life_to_date_spend_by_category").select("*").order("total", { ascending: false }),
    supabase.from("weekly_rollup").select("week_number, total_expenses").order("total_expenses", { ascending: false }),
    supabase.from("account_balance").select("current_balance").single(),
    supabase.from("recurring_bills").select("monthly_cost_usd, billing_day").eq("active", true),
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

  const currentBalance = balanceRow?.current_balance ?? 0;

  // ---- Cash flow forecast: projected end-of-month balance ----
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  const daysRemainingInMonth = daysInMonth - today;
  const remainingBillsThisMonth = (activeBills ?? [])
    .filter((b) => b.billing_day && b.billing_day >= today)
    .reduce((s, b) => s + b.monthly_cost_usd, 0);
  const forecastNetPerDay = avgWeeklyNet / 7;
  const projectedMonthEndBalance = currentBalance + forecastNetPerDay * daysRemainingInMonth - remainingBillsThisMonth;

  // ---- Financial health ratios ----
  const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0;
  const avgMonthlySpend = avgDailySpend * 30.44;
  const emergencyFundMonths = avgMonthlySpend > 0 ? currentBalance / avgMonthlySpend : 0;

  const thisMonthDiscretionary = (allTx ?? [])
    .filter((t) => t.date >= thisMonthStart && t.necessity === "Discretionary")
    .reduce((s, t) => s + (t.amount_usd ?? 0), 0);
  const thisMonthDiscretionaryShare = thisMonthSpend > 0 ? (thisMonthDiscretionary / thisMonthSpend) * 100 : 0;
  const lastMonthDiscretionary = (allTx ?? [])
    .filter((t) => t.date >= lastMonthStart && t.date < thisMonthStart && t.necessity === "Discretionary")
    .reduce((s, t) => s + (t.amount_usd ?? 0), 0);
  const lastMonthDiscretionaryShare = lastMonthSpend > 0 ? (lastMonthDiscretionary / lastMonthSpend) * 100 : 0;
  const discretionaryTrendDelta = thisMonthDiscretionaryShare - lastMonthDiscretionaryShare;

  // ---- Year-over-year ----
  const years = Array.from(new Set((allTx ?? []).map((t) => t.date.slice(0, 4)))).sort();
  const yoyData: YearOverYearPoint[] = MONTH_NAMES.map((label, i) => {
    const monthStr = String(i + 1).padStart(2, "0");
    const row: YearOverYearPoint = { month: label };
    for (const y of years) {
      row[y] = (allTx ?? [])
        .filter((t) => t.date.slice(0, 4) === y && t.date.slice(5, 7) === monthStr)
        .reduce((s, t) => s + (t.amount_usd ?? 0), 0);
    }
    return row;
  });
  const yearTotals = years
    .map((y) => {
      const spend = (allTx ?? []).filter((t) => t.date.slice(0, 4) === y).reduce((s, t) => s + (t.amount_usd ?? 0), 0);
      const income = (allIncome ?? []).filter((inc) => inc.date.slice(0, 4) === y).reduce((s, inc) => s + (inc.amount_usd ?? 0), 0);
      return { year: y, spend, income, net: income - spend };
    })
    .reverse();

  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle="Fun facts and totals about your money, all calculated for you."
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
      </div>

      <div className="section-header mt-8 mb-3">Financial Health</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Projected Balance — End of This Month"
          value={fmtUsd(projectedMonthEndBalance)}
          delta={`${daysRemainingInMonth} day${daysRemainingInMonth === 1 ? "" : "s"} left, ${fmtUsd(remainingBillsThisMonth)} in bills due`}
          size="small"
        />
        <StatCard
          label="Savings Rate (Life-to-Date)"
          value={`${savingsRate.toFixed(0)}%`}
          delta="Income kept after expenses"
          size="small"
        />
        <StatCard
          label="Emergency Fund Coverage"
          value={`${emergencyFundMonths.toFixed(1)} mo`}
          delta="Current balance ÷ avg monthly spend"
          size="small"
        />
        <StatCard
          label="Discretionary Spend Trend"
          value={`${discretionaryTrendDelta >= 0 ? "↑" : "↓"} ${Math.abs(discretionaryTrendDelta).toFixed(0)}pt`}
          delta={`${thisMonthDiscretionaryShare.toFixed(0)}% this month vs ${lastMonthDiscretionaryShare.toFixed(0)}% last month`}
          size="small"
        />
      </div>

      {years.length > 0 && (
        <>
          <div className="section-header mt-8 mb-3">Year over Year</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <YearOverYearChart data={yoyData} years={years} />
            </div>
            <Glass className="p-5">
              <div className="ios-headline mb-3">By Year</div>
              <div className="flex flex-col">
                {yearTotals.map((yt, i) => (
                  <div key={yt.year}>
                    {i > 0 && <div className="h-px bg-[var(--separator)]" />}
                    <div className="py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="ios-subhead text-text font-medium">{yt.year}</span>
                        <span className={`num text-[14px] font-semibold ${yt.net >= 0 ? "pos" : "neg"}`}>{fmtUsd(yt.net)}</span>
                      </div>
                      <div className="stat-label num mt-0.5">
                        {fmtUsd(yt.income)} in · {fmtUsd(yt.spend)} out
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Glass>
          </div>
        </>
      )}
    </div>
  );
}
