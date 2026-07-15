"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; success?: boolean } | undefined;

export async function updateSettings(_prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in." };

  const thresholdRaw = String(formData.get("low_balance_threshold") ?? "").trim();

  const { error } = await supabase
    .from("settings")
    .update({
      tracking_start_date: String(formData.get("tracking_start_date")),
      low_balance_threshold: thresholdRaw ? Number(thresholdRaw) : null,
    })
    .eq("user_id", userData.user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export type AccountsState = { error?: string; success?: boolean } | undefined;

export async function updateAccountBalances(_prevState: AccountsState, formData: FormData): Promise<AccountsState> {
  const supabase = await createClient();

  const updates: { id: string; starting_balance: number; interest_rate_pct: number | null }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("account_")) continue;
    const id = key.slice("account_".length);
    const amount = Number(value);
    if (Number.isNaN(amount)) continue;
    const rateRaw = String(formData.get(`rate_${id}`) ?? "").trim();
    updates.push({ id, starting_balance: amount, interest_rate_pct: rateRaw ? Number(rateRaw) : null });
  }

  for (const u of updates) {
    const { error } = await supabase
      .from("accounts")
      .update({ starting_balance: u.starting_balance, interest_rate_pct: u.interest_rate_pct })
      .eq("id", u.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function addAccount(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };
  const kind = String(formData.get("kind") ?? "asset");

  const { data: existing } = await supabase.from("accounts").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const nextSort = (existing?.[0]?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("accounts").insert({
    name,
    kind,
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

export async function addCurrency(formData: FormData) {
  const supabase = await createClient();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const rate = Number(formData.get("rate_to_usd"));
  if (!code) return { error: "Currency code is required." };
  if (code === "USD") return { error: "USD is already the base currency." };
  if (!name) return { error: "Name is required." };
  if (!rate || Number.isNaN(rate) || rate <= 0) return { error: "Rate must be a positive number." };

  const { error } = await supabase.from("currencies").insert({ code, name, rate_to_usd: rate });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteCurrency(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("currencies").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: true };
}

export type CurrenciesState = { error?: string; success?: boolean } | undefined;

export async function updateCurrencyRates(_prevState: CurrenciesState, formData: FormData): Promise<CurrenciesState> {
  const supabase = await createClient();

  const updates: { id: string; rate_to_usd: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("currency_")) continue;
    const id = key.slice("currency_".length);
    const rate = Number(value);
    if (!rate || Number.isNaN(rate) || rate <= 0) continue;
    updates.push({ id, rate_to_usd: rate });
  }

  for (const u of updates) {
    const { error } = await supabase.from("currencies").update({ rate_to_usd: u.rate_to_usd }).eq("id", u.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function exportAllData() {
  const supabase = await createClient();

  const [
    settings,
    categories,
    accounts,
    currencies,
    transactions,
    transactionSplits,
    income,
    transfers,
    recurringBills,
    savingsGoals,
    netWorthSnapshots,
    netWorthSnapshotBalances,
    keyDates,
    semesters,
  ] = await Promise.all([
    supabase.from("settings").select("*").single(),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("accounts").select("*").order("sort_order"),
    supabase.from("currencies").select("*").order("code"),
    supabase.from("transactions").select("*").order("date"),
    supabase.from("transaction_splits").select("*"),
    supabase.from("income").select("*").order("date"),
    supabase.from("transfers").select("*").order("date"),
    supabase.from("recurring_bills").select("*"),
    supabase.from("savings_goals").select("*"),
    supabase.from("net_worth_snapshots").select("*").order("snapshot_date"),
    supabase.from("net_worth_snapshot_balances").select("*"),
    supabase.from("key_dates").select("*").order("sort_order"),
    supabase.from("semesters").select("*").order("start_date"),
  ]);

  return {
    exported_at: new Date().toISOString(),
    settings: settings.data,
    categories: categories.data ?? [],
    accounts: accounts.data ?? [],
    currencies: currencies.data ?? [],
    transactions: transactions.data ?? [],
    transaction_splits: transactionSplits.data ?? [],
    income: income.data ?? [],
    transfers: transfers.data ?? [],
    recurring_bills: recurringBills.data ?? [],
    savings_goals: savingsGoals.data ?? [],
    net_worth_snapshots: netWorthSnapshots.data ?? [],
    net_worth_snapshot_balances: netWorthSnapshotBalances.data ?? [],
    key_dates: keyDates.data ?? [],
    semesters: semesters.data ?? [],
  };
}
