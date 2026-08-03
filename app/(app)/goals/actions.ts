"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";

function revalidateAffected() {
  revalidatePath("/");
  revalidatePath("/goals");
}

export async function createSavingsGoal(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const target = String(formData.get("target") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD");
  const targetDate = String(formData.get("target_date") ?? "").trim();
  const accountId = String(formData.get("account_id") ?? "");
  const saved = String(formData.get("saved_manual") ?? "").trim();

  if (!name) return { error: "Give the goal a name." };
  if (currency !== "USD" && currency !== "ETB") return { error: "Pick a currency." };

  let targetMinor: bigint;
  try {
    targetMinor = toMinor(target);
  } catch {
    return { error: "Enter a target like 1200." };
  }
  if (targetMinor <= 0n) return { error: "The target has to be more than zero." };

  let savedMinor = 0n;
  if (!accountId && saved !== "") {
    try {
      savedMinor = toMinor(saved);
    } catch {
      return { error: "Enter what you've saved so far as a plain amount." };
    }
  }

  // A linked goal must match its account's currency: progress is read straight
  // off that account's balance, so a mismatch would compare two different
  // units and silently overstate or understate the goal.
  if (accountId) {
    const { data: account } = await supabase
      .from("accounts")
      .select("currency")
      .eq("id", accountId)
      .maybeSingle();
    if (!account) return { error: "That account no longer exists." };
    if (account.currency !== currency) {
      return { error: "Pick an account in the same currency as the goal, or track it manually." };
    }
  }

  const { error } = await supabase.from("savings_goals").insert({
    user_id: user.id,
    name,
    target_minor: Number(targetMinor),
    currency,
    target_date: targetDate || null,
    account_id: accountId || null,
    saved_manual_minor: Number(savedMinor),
  });

  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

/** Only meaningful for an unlinked goal — a linked one reads its account. */
export async function updateGoalSaved(id: string, amount: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  let minor: bigint;
  try {
    minor = toMinor(amount.trim() === "" ? "0" : amount);
  } catch {
    return { error: "Enter a plain amount." };
  }

  const { error } = await supabase
    .from("savings_goals")
    .update({ saved_manual_minor: Number(minor) })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

export async function deleteSavingsGoal(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("savings_goals").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}
