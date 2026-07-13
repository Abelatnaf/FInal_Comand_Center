"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type QuickAddState =
  | { error?: string; success?: boolean; duplicateWarning?: string }
  | undefined;

async function uploadReceipt(
  supabase: Awaited<ReturnType<typeof createClient>>,
  transactionId: string,
  file: File
) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userData.user.id}/${transactionId}.${ext}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, { upsert: true });
  if (!error) {
    await supabase.from("transactions").update({ receipt_path: path }).eq("id", transactionId);
  }
}

export async function addTransaction(
  _prevState: QuickAddState,
  formData: FormData
): Promise<QuickAddState> {
  const supabase = await createClient();

  const date = String(formData.get("date"));
  const amount = Number(formData.get("amount"));
  const categoryId = Number(formData.get("category_id"));
  const confirmDuplicate = formData.get("confirm_duplicate") === "true";

  if (!confirmDuplicate) {
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("date", date)
      .eq("amount_original", amount)
      .eq("category_id", categoryId)
      .limit(1);
    if (existing && existing.length > 0) {
      return { duplicateWarning: "A transaction with the same date, amount, and category already exists." };
    }
  }

  const accountId = String(formData.get("account_id") ?? "") || null;

  const { data: tx, error } = await supabase
    .from("transactions")
    .insert({
      date,
      category_id: categoryId,
      account_id: accountId,
      description: String(formData.get("description") ?? "") || null,
      necessity: String(formData.get("necessity")),
      is_recurring: formData.get("is_recurring") === "on",
      currency: String(formData.get("currency")),
      amount_original: amount,
      payment_method: String(formData.get("payment_method")),
      notes: String(formData.get("notes") ?? "") || null,
    })
    .select("id, amount_usd")
    .single();

  if (error) return { error: error.message };

  const splitsRaw = formData.get("splits");
  if (splitsRaw) {
    try {
      const splits: { category_id: number; amount_usd: number }[] = JSON.parse(String(splitsRaw));
      if (splits.length > 1) {
        const { error: splitError } = await supabase
          .from("transaction_splits")
          .insert(splits.map((s) => ({ transaction_id: tx.id, category_id: s.category_id, amount_usd: s.amount_usd })));
        if (splitError) return { error: splitError.message };
      }
    } catch {
      // malformed splits payload — ignore, transaction still saved as a single category
    }
  }

  const receipt = formData.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    await uploadReceipt(supabase, tx.id, receipt);
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  if (accountId) revalidatePath(`/accounts/${accountId}`);
  return { success: true };
}

export async function addIncome(
  _prevState: QuickAddState,
  formData: FormData
): Promise<QuickAddState> {
  const supabase = await createClient();

  const date = String(formData.get("date"));
  const amount = Number(formData.get("amount"));
  const source = String(formData.get("source") ?? "") || null;
  const confirmDuplicate = formData.get("confirm_duplicate") === "true";

  if (!confirmDuplicate) {
    let query = supabase.from("income").select("id").eq("date", date).eq("amount_original", amount);
    query = source ? query.eq("source", source) : query.is("source", null);
    const { data: existing } = await query.limit(1);
    if (existing && existing.length > 0) {
      return { duplicateWarning: "An income entry with the same date, amount, and source already exists." };
    }
  }

  const accountId = String(formData.get("account_id") ?? "") || null;

  const { error } = await supabase.from("income").insert({
    date,
    source,
    account_id: accountId,
    currency: String(formData.get("currency")),
    amount_original: amount,
    notes: String(formData.get("notes") ?? "") || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/income");
  if (accountId) revalidatePath(`/accounts/${accountId}`);
  return { success: true };
}

export type TransferState = { error?: string; success?: boolean } | undefined;

export async function addTransfer(_prevState: TransferState, formData: FormData): Promise<TransferState> {
  const supabase = await createClient();

  const fromAccountId = String(formData.get("from_account_id"));
  const toAccountId = String(formData.get("to_account_id"));
  if (fromAccountId === toAccountId) {
    return { error: "Pick two different accounts." };
  }

  const { error } = await supabase.from("transfers").insert({
    date: String(formData.get("date")),
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    amount_usd: Number(formData.get("amount")),
    notes: String(formData.get("notes") ?? "") || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/transfers");
  return { success: true };
}
