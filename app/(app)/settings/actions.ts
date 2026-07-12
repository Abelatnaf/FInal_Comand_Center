"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; success?: boolean } | undefined;

export async function updateSettings(_prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("settings")
    .update({
      fx_rate: Number(formData.get("fx_rate")),
      matriculation_date: String(formData.get("matriculation_date")),
      starting_sofi: Number(formData.get("starting_sofi") ?? 0),
      starting_ally: Number(formData.get("starting_ally") ?? 0),
      starting_cash: Number(formData.get("starting_cash") ?? 0),
    })
    .eq("id", 1);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export type BudgetsState = { error?: string; success?: boolean } | undefined;

export async function updateCategoryBudgets(_prevState: BudgetsState, formData: FormData): Promise<BudgetsState> {
  const supabase = await createClient();

  const updates: { id: number; monthly_budget: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("budget_")) continue;
    const id = Number(key.slice("budget_".length));
    const amount = Number(value);
    if (Number.isNaN(id) || Number.isNaN(amount) || amount < 0) continue;
    updates.push({ id, monthly_budget: amount });
  }

  for (const u of updates) {
    const { error } = await supabase.from("categories").update({ monthly_budget: u.monthly_budget }).eq("id", u.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
