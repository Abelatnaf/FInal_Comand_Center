import { PageHeader } from "@/components/glass/Glass";
import { WeeklyRollupCharts } from "@/components/charts/WeeklyRollupCharts";
import { WeeklyRollupTable } from "@/components/tables/WeeklyRollupTable";
import { createClient } from "@/lib/supabase/server";

export default async function WeeklyRollupPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("weekly_rollup")
    .select("*")
    .order("cadet_week");

  const typedRows = (rows ?? [])
    .filter((r) => r.cadet_week !== null && r.week_start !== null && r.week_end !== null)
    .map((r) => ({
      cadet_week: r.cadet_week!,
      week_start: r.week_start!,
      week_end: r.week_end!,
      total_expenses: r.total_expenses ?? 0,
      necessary: r.necessary ?? 0,
      discretionary: r.discretionary ?? 0,
      total_income: r.total_income ?? 0,
      net: r.net ?? 0,
      running_balance: r.running_balance ?? 0,
    }));

  return (
    <div>
      <PageHeader
        eyebrow="VMI FINANCE"
        title="Weekly Rollup"
        subtitle="Computed live from transactions, grouped by cadet week."
      />
      <WeeklyRollupCharts rows={typedRows} />
      <WeeklyRollupTable rows={typedRows} />
    </div>
  );
}
