"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function goalFromForm(formData: FormData) {
  return {
    name: String(formData.get("name")),
    target_amount_usd: Number(formData.get("target_amount_usd")),
    target_date: String(formData.get("target_date") ?? "") || null,
    account_id: String(formData.get("account_id") ?? "") || null,
  };
}

export async function addSavingsGoal(formData: FormData) {
  const goal = goalFromForm(formData);
  if (!goal.account_id) return { error: "Choose an account to track this goal." };
  const supabase = await createClient();
  const { error } = await supabase.from("savings_goals").insert(goal);
  if (error) return { error: error.message };
  revalidatePath("/savings-goals");
  revalidatePath("/");
  return { success: true };
}

export async function updateSavingsGoal(id: string, formData: FormData) {
  const goal = goalFromForm(formData);
  if (!goal.account_id) return { error: "Choose an account to track this goal." };
  const supabase = await createClient();
  const { error } = await supabase.from("savings_goals").update(goal).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/savings-goals");
  revalidatePath("/");
  return { success: true };
}

export async function deleteSavingsGoal(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("savings_goals").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/savings-goals");
  revalidatePath("/");
  return { success: true };
}
