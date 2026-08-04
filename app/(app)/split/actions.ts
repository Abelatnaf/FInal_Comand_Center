"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";

export type SplitState = { error?: string; success?: boolean } | undefined;

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/split");
  revalidatePath("/ledger");
}

/**
 * Records what someone owes you on an expense you already paid in full.
 *
 * The expense itself is deliberately left whole: that is what actually left
 * your account, and shaving it down would put balances and category totals out
 * of step with reality. A share is an IOU sitting alongside it.
 */
export async function addSplit(_prev: SplitState, formData: FormData): Promise<SplitState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const transactionId = String(formData.get("transaction_id") ?? "");
  const person = String(formData.get("person") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();

  if (!transactionId) return { error: "Pick which expense this splits." };
  if (!person) return { error: "Who owes you?" };

  let minor: bigint;
  try {
    minor = toMinor(amountRaw);
  } catch {
    return { error: "Enter an amount like 12.50." };
  }
  if (minor <= 0n) return { error: "Enter an amount greater than zero." };

  const { data: tx } = await supabase
    .from("transactions")
    .select("amount_minor")
    .eq("id", transactionId)
    .maybeSingle();
  if (!tx) return { error: "That expense no longer exists." };

  const { data: existing } = await supabase
    .from("split_shares")
    .select("amount_minor")
    .eq("transaction_id", transactionId);

  const alreadyShared = (existing ?? []).reduce((s, r) => s + BigInt(r.amount_minor), 0n);
  // Owing more than the bill means someone typed something wrong.
  if (alreadyShared + minor > BigInt(tx.amount_minor)) {
    return { error: "That's more than the expense itself. Check the amount." };
  }

  const { error } = await supabase.from("split_shares").insert({
    user_id: user.id,
    transaction_id: transactionId,
    person,
    amount_minor: Number(minor),
  });

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

/**
 * Marks a share paid. This writes a real income entry, because that is what
 * happened -- money came back into an account. Without it the balance would
 * stay wrong even though the debt is settled.
 */
export async function settleShare(id: string, accountId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!accountId) return { error: "Pick which account it landed in." };

  const { data: share } = await supabase
    .from("split_shares")
    .select("amount_minor, person, settled_at")
    .eq("id", id)
    .maybeSingle();

  if (!share) return { error: "That share no longer exists." };
  if (share.settled_at) return { error: "Already settled." };

  const { data: inserted, error: insertError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: accountId,
      direction: "in",
      amount_minor: share.amount_minor,
      note: `${share.person} paid me back`,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };

  const { error } = await supabase
    .from("split_shares")
    .update({ settled_at: new Date().toISOString(), settled_transaction_id: inserted.id })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function deleteShare(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("split_shares").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}
