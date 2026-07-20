"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addAccount(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "asset");
  const startingBalance = Number(formData.get("startingBalance") ?? 0) || 0;
  if (!name) return;

  await supabase.from("accounts").insert({ user_id: user.id, name, kind, starting_balance: startingBalance });
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function updateAccount(id: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "asset");
  const startingBalance = Number(formData.get("startingBalance") ?? 0) || 0;
  if (!name) return;

  await supabase.from("accounts").update({ name, kind, starting_balance: startingBalance }).eq("id", id);
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  await supabase.from("accounts").delete().eq("id", id);
  revalidatePath("/settings");
  revalidatePath("/");
}

export async function addCategory(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase.from("categories").insert({ user_id: user.id, name });
  revalidatePath("/settings");
  revalidatePath("/budgets");
}

export async function deleteCategory(id: string) {
  const supabase = await createClient();
  await supabase.from("categories").delete().eq("id", id);
  revalidatePath("/settings");
  revalidatePath("/budgets");
}

export async function updateCurrencyCode(formData: FormData) {
  const supabase = await createClient();
  const currencyCode = String(formData.get("currencyCode") ?? "USD").toUpperCase().trim();
  if (!/^[A-Z]{3}$/.test(currencyCode)) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("settings").update({ currency_code: currencyCode }).eq("user_id", user.id);
  revalidatePath("/", "layout");
}

export async function exportAllData() {
  const supabase = await createClient();
  const [settings, accounts, categories, entries, goals] = await Promise.all([
    supabase.from("settings").select("*").single(),
    supabase.from("accounts").select("*"),
    supabase.from("categories").select("*"),
    supabase.from("entries").select("*"),
    supabase.from("savings_goals").select("*"),
  ]);

  return {
    exported_at: new Date().toISOString(),
    settings: settings.data,
    accounts: accounts.data,
    categories: categories.data,
    entries: entries.data,
    savings_goals: goals.data,
  };
}
