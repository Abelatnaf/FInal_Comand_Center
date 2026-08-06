"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";

const CADENCES = ["weekly", "monthly", "quarterly", "yearly"] as const;
const DIRECTIONS = ["in", "out"] as const;

function revalidateAffected() {
  revalidatePath("/");
  revalidatePath("/recurring");
  revalidatePath("/ledger");
  revalidatePath("/budgets");
  revalidatePath("/split");
}

export async function createRecurringEntry(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();
  const cadence = String(formData.get("cadence") ?? "monthly");
  const direction = String(formData.get("direction") ?? "out");
  const nextDueOn = String(formData.get("next_due_on") ?? "").trim();
  const accountId = String(formData.get("account_id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const autoPost = String(formData.get("auto_post") ?? "") === "on";

  if (!name) return { error: "Give it a name." };
  if (!(CADENCES as readonly string[]).includes(cadence)) return { error: "Pick how often it repeats." };
  if (!(DIRECTIONS as readonly string[]).includes(direction)) return { error: "Pick money in or money out." };
  if (!nextDueOn) return { error: "Pick the next date it's due." };
  if (!accountId) return { error: "Pick an account." };

  let minor: bigint;
  try {
    minor = toMinor(amount);
  } catch {
    return { error: "Enter an amount like 15.99." };
  }
  if (minor <= 0n) return { error: "Enter an amount greater than zero." };

  const { error } = await supabase.from("recurring_entries").insert({
    user_id: user.id,
    name,
    amount_minor: Number(minor),
    cadence,
    direction,
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
  const { error } = await supabase.from("recurring_entries").update({ is_active: active }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

export async function setRecurringAutoPost(id: string, autoPost: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_entries").update({ auto_post: autoPost }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

export async function deleteRecurringEntry(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_entries").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

/**
 * Logs this cycle now and moves the schedule on, for a charge that isn't set
 * to post itself (or one the user wants recorded early).
 *
 * This used to insert the transaction here. It doesn't any more, because a
 * recurring charge can now carry a split template, and posting it from the
 * app layer meant the hand-posted copy of your rent would have no IOUs on it
 * while the cron-posted copy did. Both paths go through the same database
 * function now, so there is one implementation of what "posting" means.
 */
export async function postRecurringNow(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("post_recurring_entry_now", { p_id: id });
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

/** Starts splitting a recurring charge, or returns the template already on it. */
export async function ensureSplitTemplate(
  recurringEntryId: string
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: existing } = await supabase
    .from("split_templates")
    .select("id")
    .eq("recurring_entry_id", recurringEntryId)
    .maybeSingle();
  if (existing) return { id: existing.id };

  const { data, error } = await supabase
    .from("split_templates")
    .insert({ user_id: user.id, recurring_entry_id: recurringEntryId })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidateAffected();
  return { id: data.id };
}

export async function addTemplateShare(
  templateId: string,
  person: string,
  percent: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = person.trim();
  if (!name) return { error: "Who's splitting it with you?" };

  const pct = Number(percent);
  if (!Number.isFinite(pct) || pct <= 0) return { error: "Enter a share like 33.3." };
  if (pct > 100) return { error: "A share can't be more than the whole charge." };

  // Stored in basis points so a third of a bill is 3333 rather than a float.
  const shareBp = Math.round(pct * 100);

  const { error } = await supabase
    .from("split_template_shares")
    .insert({ user_id: user.id, template_id: templateId, person: name, share_bp: shareBp });

  if (error) {
    // The database enforces the total, so surface its wording rather than a
    // raw constraint dump.
    if (error.message.includes("more than the whole charge")) {
      return { error: "Those shares add up to more than the whole charge." };
    }
    if (error.message.includes("duplicate key")) {
      return { error: `${name} is already on this split.` };
    }
    return { error: error.message };
  }
  revalidateAffected();
  return {};
}

export async function removeTemplateShare(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("split_template_shares").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

/** Stops splitting a charge. The IOUs already created stay -- they're real debts. */
export async function deleteSplitTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("split_templates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}
