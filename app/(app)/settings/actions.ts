"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; success?: boolean } | undefined;

export async function updateSettings(_prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("settings")
    .update({
      fx_rate: Number(formData.get("fx_rate")),
      tracking_start_date: String(formData.get("tracking_start_date")),
    })
    .eq("user_id", userData.user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export type AccountsState = { error?: string; success?: boolean } | undefined;

export async function updateAccountBalances(_prevState: AccountsState, formData: FormData): Promise<AccountsState> {
  const supabase = await createClient();

  const updates: { id: string; starting_balance: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("account_")) continue;
    const id = key.slice("account_".length);
    const amount = Number(value);
    if (Number.isNaN(amount)) continue;
    updates.push({ id, starting_balance: amount });
  }

  for (const u of updates) {
    const { error } = await supabase.from("accounts").update({ starting_balance: u.starting_balance }).eq("id", u.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function addAccount(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };

  const { data: existing } = await supabase.from("accounts").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const nextSort = (existing?.[0]?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("accounts").insert({
    name,
    starting_balance: Number(formData.get("starting_balance") ?? 0),
    sort_order: nextSort,
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
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
