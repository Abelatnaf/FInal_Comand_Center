"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";

export type ActionState = { error?: string; success?: boolean } | undefined;

const ACCOUNT_KINDS = ["checking", "savings", "cash", "credit", "investment", "other"];

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/add");
  revalidatePath("/bills");
  revalidatePath("/ledger");
  revalidatePath("/settings");
}



export async function addAccount(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const institution = String(formData.get("institution") ?? "").trim() || null;
  const openingBalance = String(formData.get("opening_balance") ?? "0").trim() || "0";

  if (!name) return { error: "Name it." };
  if (!ACCOUNT_KINDS.includes(kind)) return { error: "Pick an account type." };

  // A credit card's balance is what you owe, so it is entered as a positive
  // figure and stored negative -- the sign convention every other account and
  // the net-worth sum already use.
  let openingMinor: bigint;
  try {
    openingMinor = toMinor(openingBalance.replace(/^-/, ""));
  } catch {
    return { error: "Enter a valid balance." };
  }
  if (kind === "credit") openingMinor = -openingMinor;

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name,
    kind,
    institution,
    opening_balance_minor: Number(openingMinor),
  });

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function updateAccountBalance(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const openingBalance = String(formData.get("opening_balance") ?? "0").trim() || "0";
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const institution = String(formData.get("institution") ?? "").trim() || null;
  if (!id) return { error: "Missing account." };
  if (!name) return { error: "An account needs a name." };
  if (kind && !ACCOUNT_KINDS.includes(kind)) return { error: "Pick an account type." };

  const negative = openingBalance.startsWith("-");
  let openingMinor: bigint;
  try {
    openingMinor = toMinor(openingBalance.replace(/^-/, ""));
  } catch {
    return { error: "Enter a valid amount." };
  }
  if (negative) openingMinor = -openingMinor;


  const { error } = await supabase
    .from("accounts")
    .update({
      opening_balance_minor: Number(openingMinor),
      name,
      institution,
      ...(kind ? { kind } : {}),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function toggleAccountArchived(id: string, archived: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ is_archived: archived }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function deleteAccount(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) {
    return { error: "Can't delete an account with transaction history — archive it instead." };
  }
  revalidateAll();
  return {};
}




export async function updateTrackingStartDate(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const trackingStartDate = String(formData.get("tracking_start_date") ?? "");
  if (!trackingStartDate) return { error: "Pick a date." };

  const { error } = await supabase
    .from("settings")
    .upsert({ user_id: user.id, tracking_start_date: trackingStartDate }, { onConflict: "user_id" });

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function createShareLink(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const label = String(formData.get("label") ?? "").trim() || null;

  const { error } = await supabase.from("share_links").insert({ user_id: user.id, label });
  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function revokeShareLink(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("share_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function deleteShareLink(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("share_links").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

/**
 * Hands the whole backup to a single database function rather than replaying
 * inserts from here, so it is atomic: a restore that half-applied would leave
 * the ledger in a state worse than either the backup or the current data.
 */
export async function restoreFromBackup(payload: unknown): Promise<{ error?: string; counts?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("restore_from_backup", {
    p_backup: payload as never,
  });

  if (error) return { error: error.message };
  revalidateAll();

  const counts = data as Record<string, number> | null;
  if (!counts) return {};
  return {
    counts: Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(", "),
  };
}

export async function exportAllData(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const [
    terms,
    categories,
    categoryRules,
    accounts,
    obligations,
    installments,
    transfers,
    transactions,
    splitShares,
    mealPlans,
    mealSwipeUses,
    studentLoans,
    recurring,
    goals,
    settings,
  ] = await Promise.all([
    supabase.from("terms").select("*"),
    supabase.from("categories").select("*"),
    supabase.from("category_rules").select("*"),
    supabase.from("accounts").select("*"),
    supabase.from("obligations").select("*"),
    supabase.from("obligation_installments").select("*"),
    supabase.from("transfers").select("*"),
    supabase.from("transactions").select("*"),
    supabase.from("split_shares").select("*"),
    supabase.from("meal_plans").select("*"),
    supabase.from("meal_swipe_uses").select("*"),
    supabase.from("student_loans").select("*"),
    supabase.from("recurring_entries").select("*"),
    supabase.from("savings_goals").select("*"),
    supabase.from("settings").select("*"),
  ]);

  // Every table restore_from_backup() reads has to be here, or a backup won't
  // round-trip -- an export that silently omits a table is a broken backup.
  return {
    exported_at: new Date().toISOString(),
    terms: terms.data,
    categories: categories.data,
    category_rules: categoryRules.data,
    accounts: accounts.data,
    obligations: obligations.data,
    obligation_installments: installments.data,
    transfers: transfers.data,
    transactions: transactions.data,
    split_shares: splitShares.data,
    meal_plans: mealPlans.data,
    meal_swipe_uses: mealSwipeUses.data,
    student_loans: studentLoans.data,
    recurring_entries: recurring.data,
    savings_goals: goals.data,
    settings: settings.data,
  };
}

export async function updateDisplayName(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const displayName = String(formData.get("display_name") ?? "").trim() || null;

  const { error } = await supabase
    .from("settings")
    .update({ display_name: displayName })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function addCategoryRule(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const matchText = String(formData.get("match_text") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");

  if (!matchText) return { error: "Enter some text to match on." };
  if (!categoryId) return { error: "Pick a category." };

  const { error } = await supabase
    .from("category_rules")
    .insert({ user_id: user.id, match_text: matchText, category_id: categoryId });

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function deleteCategoryRule(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("category_rules").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

/**
 * Applies every rule to entries that have no category yet. New rules only fire
 * on write, so without this a rule added after the fact would never reach the
 * history that prompted someone to write it.
 */
export async function applyRulesToUncategorized(): Promise<{ error?: string; updated?: number }> {
  const supabase = await createClient();

  const [{ data: rules }, { data: rows }] = await Promise.all([
    supabase
      .from("category_rules")
      .select("match_text, category_id, priority, categories(kind, is_archived)")
      .order("priority"),
    supabase.from("transactions").select("id, note, direction").is("category_id", null),
  ]);

  if (!rules?.length || !rows?.length) return { updated: 0 };

  // Longest match first at equal priority, so a specific rule beats a generic
  // one that happens to also match -- the same order the database trigger uses.
  const ordered = [...rules].sort(
    (a, b) => a.priority - b.priority || b.match_text.length - a.match_text.length
  );

  let updated = 0;
  for (const row of rows) {
    const note = row.note?.toLowerCase();
    if (!note) continue;
    const hit = ordered.find((r) => {
      const category = r.categories as { kind: string; is_archived: boolean } | null;
      if (!category || category.is_archived) return false;
      if (category.kind !== (row.direction === "out" ? "expense" : "income")) return false;
      return note.includes(r.match_text.toLowerCase());
    });
    if (!hit) continue;
    const { error } = await supabase
      .from("transactions")
      .update({ category_id: hit.category_id })
      .eq("id", row.id);
    if (error) return { error: error.message };
    updated += 1;
  }

  revalidateAll();
  return { updated };
}

/**
 * Deletes the signed-in user's data and their login, in one database function
 * so it can't half-apply. Everything is scoped to auth.uid() inside that
 * function -- this action supplies no id of its own.
 */
export async function deleteMyAccount(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_own_account");
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  return {};
}
