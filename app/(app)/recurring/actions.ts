"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";

const CADENCES = ["weekly", "monthly", "quarterly", "yearly"] as const;

function revalidateAffected() {
  revalidatePath("/");
  revalidatePath("/recurring");
  revalidatePath("/ledger");
  revalidatePath("/budgets");
}

export async function createRecurringExpense(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();
  const cadence = String(formData.get("cadence") ?? "monthly");
  const nextDueOn = String(formData.get("next_due_on") ?? "").trim();
  const accountId = String(formData.get("account_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const autoPost = String(formData.get("auto_post") ?? "") === "on";

  if (!name) return { error: "Give it a name." };
  if (!(CADENCES as readonly string[]).includes(cadence)) return { error: "Pick how often it repeats." };
  if (!nextDueOn) return { error: "Pick the next date it's due." };
  if (!accountId) return { error: "Pick an account." };

  let minor: bigint;
  try {
    minor = toMinor(amount);
  } catch {
    return { error: "Enter an amount like 15.99." };
  }
  if (minor <= 0n) return { error: "Enter an amount greater than zero." };

  const { error } = await supabase.from("recurring_expenses").insert({
    user_id: user.id,
    name,
    amount_minor: Number(minor),
    cadence,
    next_due_on: nextDueOn,
    account_id: accountId,
    category_id: categoryId || null,
    auto_post: autoPost,
  });

  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

export async function setRecurringActive(id: string, active: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").update({ is_active: active }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

export async function setRecurringAutoPost(id: string, autoPost: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").update({ auto_post: autoPost }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

export async function deleteRecurringExpense(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

/**
 * Logs this cycle now and moves the schedule on, for a subscription that
 * isn't set to post itself (or one the user wants recorded early). Written as
 * a normal insert, so it picks up auto-categorisation rules the same way a
 * hand-entered row would.
 */
export async function postRecurringNow(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: rec, error: readError } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("id", id)
    .single();

  if (readError || !rec) return { error: readError?.message ?? "Not found." };

  const { error: insertError } = await supabase.from("transactions").insert({
    user_id: user.id,
    account_id: rec.account_id,
    occurred_on: rec.next_due_on,
    direction: "out",
    amount_minor: rec.amount_minor,
    category_id: rec.category_id,
    note: rec.note?.trim() || rec.name,
  });

  if (insertError) return { error: insertError.message };

  const next = new Date(`${rec.next_due_on}T00:00:00`);
  if (rec.cadence === "weekly") next.setDate(next.getDate() + 7);
  else if (rec.cadence === "monthly") next.setMonth(next.getMonth() + 1);
  else if (rec.cadence === "quarterly") next.setMonth(next.getMonth() + 3);
  else next.setFullYear(next.getFullYear() + 1);

  const { error: updateError } = await supabase
    .from("recurring_expenses")
    .update({
      last_posted_on: rec.next_due_on,
      next_due_on: next.toISOString().slice(0, 10),
    })
    .eq("id", id);

  if (updateError) return { error: updateError.message };

  revalidateAffected();
  return {};
}
