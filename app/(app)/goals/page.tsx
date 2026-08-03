import { createClient } from "@/lib/supabase/server";
import { GoalsManager, type GoalItem } from "@/components/goals/GoalsManager";

export default async function GoalsPage() {
  const supabase = await createClient();

  const [goalsRes, accountsRes] = await Promise.all([
    supabase.from("savings_goal_progress").select("*").order("created_at"),
    supabase.from("accounts").select("id, name").eq("is_archived", false).order("name"),
  ]);

  const goals: GoalItem[] = (goalsRes.data ?? []).map((g) => ({
    id: g.id ?? "",
    name: g.name ?? "—",
    target_minor: g.target_minor ?? 0,
    saved_minor: g.saved_minor ?? 0,
    remaining_minor: g.remaining_minor ?? 0,
    target_date: g.target_date,
    days_until_target: g.days_until_target,
    account_id: g.account_id,
    account_name: g.account_name,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Goals</h1>
        <p className="text-[14px] text-muted mt-0.5">What you&rsquo;re saving towards</p>
      </div>

      <GoalsManager goals={goals} accounts={accountsRes.data ?? []} />
    </div>
  );
}
