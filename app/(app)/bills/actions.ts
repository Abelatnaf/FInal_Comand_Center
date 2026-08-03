"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";
import { RECEIPT_BUCKET, MAX_RECEIPT_BYTES } from "@/lib/receipts";

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
  const dueOn = String(formData.get("due_on") ?? "").trim() || null;
  const amount = String(formData.get("amount") ?? "").trim();
  const sourceNote = String(formData.get("source_note") ?? "").trim() || null;

  if (!title) return { error: "Give it a title." };

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

/**
 * Attaches the bill's own statement. Stored in the same private bucket as
 * receipts under "<user_id>/obligations/<id>/..." -- the bucket's policies key
 * off the first path segment being auth.uid(), so this needs no new rules.
 */
export async function attachStatement(obligationId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const file = formData.get("statement");
  if (!(file instanceof File) || file.size === 0) return { error: "Pick a file first." };
  if (file.size > MAX_RECEIPT_BYTES) return { error: "That file is over 8MB." };

  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase().slice(0, 5) : "bin";
  const path = `${user.id}/obligations/${obligationId}/statement.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(RECEIPT_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (uploadError) return { error: uploadError.message };

  const { error } = await supabase.from("obligations").update({ statement_path: path }).eq("id", obligationId);
  if (error) return { error: error.message };

  revalidateAll();
  revalidatePath(`/bills/${obligationId}`);
  return {};
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

/**
 * Replaces an obligation's whole installment plan in one shot: delete then
 * re-insert, rather than diffing rows. The plan is small (a handful of parts)
 * and `seq` is uniquely constrained per obligation, so an in-place edit would
 * have to juggle ordering conflicts for no real benefit.
 *
 * Nothing about payment is written here -- which installment is settled is
 * derived from cumulative amounts vs. what's actually been paid, so a plan
 * edit can never contradict the ledger.
 */
export async function setInstallmentPlan(
  obligationId: string,
  parts: { due_on: string | null; amount: string }[]
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const rows: { user_id: string; obligation_id: string; seq: number; due_on: string | null; amount_usd_minor: number }[] = [];
  for (const [i, part] of parts.entries()) {
    const raw = part.amount.trim();
    if (raw === "") continue;
    let minor: bigint;
    try {
      minor = toMinor(raw);
    } catch {
      return { error: `Part ${i + 1} isn't a valid amount.` };
    }
    if (minor <= 0n) return { error: `Part ${i + 1} has to be more than zero.` };
    rows.push({
      user_id: user.id,
      obligation_id: obligationId,
      seq: rows.length + 1,
      due_on: part.due_on || null,
      amount_usd_minor: Number(minor),
    });
  }

  const { error: deleteError } = await supabase
    .from("obligation_installments")
    .delete()
    .eq("obligation_id", obligationId);
  if (deleteError) return { error: deleteError.message };

  if (rows.length > 0) {
    const { error } = await supabase.from("obligation_installments").insert(rows);
    if (error) return { error: error.message };
  }

  revalidateAll();
  revalidatePath(`/bills/${obligationId}`);
  return {};
}

/**
 * Sets or clears a repeat interval. Clearing it also clears recur_spawned_at,
 * so re-enabling a repeat later starts fresh rather than being permanently
 * considered "already spawned".
 */
export async function setObligationRecurrence(
  id: string,
  intervalMonths: number | null
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("obligations")
    .update({
      recur_interval_months: intervalMonths,
      recur_spawned_at: null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateAll();
  revalidatePath(`/bills/${id}`);
  return {};
}

// Bills like insurance premiums or tuition come round again for a similar
// amount, so duplicating one saves retyping it. due_on and source_note are
// deliberately left blank rather than copied: the point is the new bill's own
// date and paperwork, not a stale copy of the last one's.
export async function duplicateObligation(id: string): Promise<{ error?: string; newId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: source, error: fetchError } = await supabase
    .from("obligations")
    .select("title, amount_usd_minor")
    .eq("id", id)
    .single();

  if (fetchError || !source) return { error: fetchError?.message ?? "Bill not found." };

  const { data, error } = await supabase
    .from("obligations")
    .insert({
      user_id: user.id,
      title: source.title,
      amount_usd_minor: source.amount_usd_minor,
      due_on: null,
      source_note: null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidateAll();
  return { newId: data.id };
}
