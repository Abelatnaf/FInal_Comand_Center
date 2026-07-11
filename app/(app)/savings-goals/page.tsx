import { PageHeader } from "@/components/glass/Glass";
import { SavingsGoalsList } from "@/components/tables/SavingsGoalsList";
import { createClient } from "@/lib/supabase/server";

export default async function SavingsGoalsPage() {
  const supabase = await createClient();

  const { data: goals } = await supabase.from("savings_goal_progress").select("*").order("target_date");

  const typedGoals = (goals ?? [])
    .filter((g) => g.id !== null)
    .map((g) => ({
      id: g.id!,
      name: g.name ?? "",
      target_amount_usd: g.target_amount_usd ?? 0,
      target_date: g.target_date,
      saved_so_far_usd: g.saved_so_far_usd ?? 0,
      remaining: g.remaining ?? 0,
      percent_complete: g.percent_complete ?? 0,
      monthly_needed: g.monthly_needed,
    }));

  return (
    <div>
      <PageHeader
        eyebrow="VMI FINANCE"
        title="Savings Goals"
        subtitle="Progress bars, computed remaining / monthly needed."
      />
      <SavingsGoalsList goals={typedGoals} />
    </div>
  );
}
