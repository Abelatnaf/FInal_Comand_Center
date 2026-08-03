"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";

export type TransferState = { error?: string; success?: boolean } | undefined;

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/ledger");
}

/**
 * Records money moving between two of your own accounts.
 *
 * Both amounts are taken from the form rather than converting one into the
 * other: for a cross-currency move the two figures are genuinely independent
 * facts (what left, what arrived), and any spread or fee lives in the gap.
 * Inferring one from a rate would be inventing a number.
 */
export async function createTransfer(_prev: TransferState, formData: FormData): Promise<TransferState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const fromId = String(formData.get("from_account_id") ?? "");
  const toId = String(formData.get("to_account_id") ?? "");
  const occurredOn = String(formData.get("occurred_on") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!fromId || !toId) return { error: "Pick both accounts." };
  if (fromId === toId) return { error: "Pick two different accounts." };

  let amountMinor: bigint;
  try {
    amountMinor = toMinor(String(formData.get("amount") ?? "").trim());
  } catch {
    return { error: "Enter a valid amount." };
  }
  if (amountMinor <= 0n) return { error: "The amount has to be more than zero." };

  const { error } = await supabase.from("transfers").insert({
    user_id: user.id,
    from_account_id: fromId,
    to_account_id: toId,
    amount_minor: Number(amountMinor),
    occurred_on: occurredOn || undefined,
    note,
  });

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function updateTransfer(_prev: TransferState, formData: FormData): Promise<TransferState> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing transfer." };

  const fromId = String(formData.get("from_account_id") ?? "");
  const toId = String(formData.get("to_account_id") ?? "");
  if (!fromId || !toId) return { error: "Pick both accounts." };
  if (fromId === toId) return { error: "Pick two different accounts." };

  let amountMinor: bigint;
  try {
    amountMinor = toMinor(String(formData.get("amount") ?? "").trim());
  } catch {
    return { error: "Enter a valid amount." };
  }
  if (amountMinor <= 0n) return { error: "The amount has to be more than zero." };

  const { error } = await supabase
    .from("transfers")
    .update({
      from_account_id: fromId,
      to_account_id: toId,
      amount_minor: Number(amountMinor),
      occurred_on: String(formData.get("occurred_on") ?? "").trim() || undefined,
      note: String(formData.get("note") ?? "").trim() || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function deleteTransfer(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("transfers").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}
