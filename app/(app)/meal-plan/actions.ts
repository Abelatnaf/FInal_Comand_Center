"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MealState = { error?: string; success?: boolean } | undefined;

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/meal-plan");
}

export async function createMealPlan(_prev: MealState, formData: FormData): Promise<MealState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const termId = String(formData.get("term_id") ?? "");
  const name = String(formData.get("name") ?? "").trim() || "Meal plan";
  const accountId = String(formData.get("account_id") ?? "") || null;
  const swipesRaw = String(formData.get("swipes_total") ?? "").trim();

  if (!termId) return { error: "Pick which term this covers." };

  let swipesTotal: number | null = null;
  if (swipesRaw) {
    const n = Number(swipesRaw);
    if (!Number.isInteger(n) || n < 0) return { error: "Swipes has to be a whole number." };
    swipesTotal = n;
  }

  const { error } = await supabase.from("meal_plans").insert({
    user_id: user.id,
    term_id: termId,
    name,
    account_id: accountId,
    swipes_total: swipesTotal,
  });

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

/** One tap at the dining hall. Deliberately the fastest thing on the page. */
export async function logSwipe(mealPlanId: string, swipes = 1): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("meal_swipe_uses")
    .insert({ user_id: user.id, meal_plan_id: mealPlanId, swipes });

  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

/** Undo the most recent swipe, for the inevitable mis-tap. */
export async function undoLastSwipe(mealPlanId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("meal_swipe_uses")
    .select("id")
    .eq("meal_plan_id", mealPlanId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!last) return { error: "Nothing to undo." };

  const { error } = await supabase.from("meal_swipe_uses").delete().eq("id", last.id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function deleteMealPlan(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("meal_plans").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}
