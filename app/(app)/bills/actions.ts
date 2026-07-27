"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";

export type ActionState = { error?: string } | undefined;

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/add");
  revalidatePath("/bills");
}

export async function createObligation(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const title = String(formData.get("title") ?? "").trim();
  const payerId = String(formData.get("payer_id") ?? "");
  const dueOn = String(formData.get("due_on") ?? "").trim() || null;
  const amount = String(formData.get("amount") ?? "").trim();
  const sourceNote = String(formData.get("source_note") ?? "").trim() || null;

  if (!title) return { error: "Give it a title." };
  if (!payerId) return { error: "Pick who owes this." };

  let amountMinor: bigint;
  try {
    amountMinor = toMinor(amount);
  } catch {
    return { error: "Enter a valid USD amount." };
  }

  const { data, error } = await supabase
    .from("obligations")
    .insert({
      user_id: user.id,
      payer_id: payerId,
      title,
      due_on: dueOn,
      amount_usd_minor: Number(amountMinor),
      source_note: sourceNote,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidateAll();
  redirect(`/bills/${data.id}`);
}

export async function updateObligation(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const payerId = String(formData.get("payer_id") ?? "");
  const dueOn = String(formData.get("due_on") ?? "").trim() || null;
  const amount = String(formData.get("amount") ?? "").trim();
  const sourceNote = String(formData.get("source_note") ?? "").trim() || null;

  if (!id) return { error: "Missing bill." };
  if (!title) return { error: "Give it a title." };

  let amountMinor: bigint;
  try {
    amountMinor = toMinor(amount);
  } catch {
    return { error: "Enter a valid USD amount." };
  }

  const { error } = await supabase
    .from("obligations")
    .update({
      title,
      payer_id: payerId,
      due_on: dueOn,
      amount_usd_minor: Number(amountMinor),
      source_note: sourceNote,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateAll();
  revalidatePath(`/bills/${id}`);
  return undefined;
}

export async function setObligationWaived(id: string, waived: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("obligations")
    .update({ waived_at: waived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  revalidatePath(`/bills/${id}`);
  return {};
}

export async function deleteObligation(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("obligations").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}
