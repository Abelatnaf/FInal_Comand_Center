import { PageHeader } from "@/components/glass/Glass";
import { MonthlyRollupCharts, type MonthlyCategoryPoint } from "@/components/charts/MonthlyRollupCharts";
import { MonthlyRollupTable } from "@/components/tables/MonthlyRollupTable";
import { createClient } from "@/lib/supabase/server";

export default async function MonthlyRollupPage() {
  const supabase = await createClient();

  const [{ data: balanceRows }, { data: categoryTotals }, { data: categories }] = await Promise.all([
    supabase.from("monthly_rollup").select("*").order("month"),
    supabase.from("monthly_category_totals").select("*"),
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);

  const categoryNames = (categories ?? []).map((c) => c.name);
  const months = (balanceRows ?? []).map((r) => r.month!).filter(Boolean);

  const categoryData: MonthlyCategoryPoint[] = months.map((month) => {
    const point: MonthlyCategoryPoint = { month };
    for (const name of categoryNames) point[name] = 0;
    for (const row of categoryTotals ?? []) {
      if (row.month === month && row.category) {
        point[row.category] = row.total ?? 0;
      }
    }
    return point;
  });

  const balanceData = (balanceRows ?? []).map((r) => ({
    month: r.month!,
    total_expenses: r.total_expenses ?? 0,
    total_income: r.total_income ?? 0,
    net: r.net ?? 0,
    running_balance: r.running_balance ?? 0,
  }));

  return (
    <div>
      <PageHeader
        eyebrow="VMI FINANCE"
        title="Monthly Rollup"
        subtitle="Category breakdown per month, plus running balance."
      />
      <MonthlyRollupCharts categoryData={categoryData} categoryNames={categoryNames} balanceData={balanceData} />
      <MonthlyRollupTable categoryData={categoryData} categoryNames={categoryNames} balanceData={balanceData} />
    </div>
  );
}
