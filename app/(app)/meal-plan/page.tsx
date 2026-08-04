import { createClient } from "@/lib/supabase/server";
import { MealPlanManager, type MealPlanRow } from "@/components/meal/MealPlanManager";

export const metadata = { title: "Meal plan" };

export default async function MealPlanPage() {
  const supabase = await createClient();

  const [plansRes, termsRes, accountsRes] = await Promise.all([
    supabase.from("meal_plan_progress").select("*"),
    supabase
      .from("terms")
      .select("id, name")
      .eq("is_archived", false)
      .order("starts_on", { ascending: false }),
    supabase
      .from("accounts")
      .select("id, name")
      .eq("kind", "meal_plan")
      .eq("is_archived", false)
      .order("name"),
  ]);

  const plans: MealPlanRow[] = (plansRes.data ?? [])
    .filter((p) => p.meal_plan_id !== null)
    .map((p) => ({
      meal_plan_id: p.meal_plan_id as string,
      name: p.name ?? "Meal plan",
      swipes_total: p.swipes_total,
      swipes_used: p.swipes_used ?? 0,
      swipes_remaining: p.swipes_remaining,
      dining_minor: p.dining_minor ?? 0,
      days_remaining: p.days_remaining ?? 0,
      weeks_remaining: p.weeks_remaining ?? 0,
    }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Meal plan</h1>
        <p className="text-[14px] text-muted mt-0.5">Swipes and dining dollars, against the term</p>
      </div>
      <MealPlanManager
        plans={plans}
        terms={termsRes.data ?? []}
        mealAccounts={accountsRes.data ?? []}
      />
    </div>
  );
}
