"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema, parseTags } from "@/lib/schemas/transaction";
import { uploadReceipt, RECEIPT_BUCKET } from "@/lib/receipts";

export type TransactionFormState = { error?: string; success?: boolean } | undefined;

function orUndefined(value: FormDataEntryValue | null): string | undefined {
  const s = String(value ?? "").trim();
  return s === "" ? undefined : s;
}

function revalidateAffected() {
  revalidatePath("/");
  revalidatePath("/ledger");
  revalidatePath("/bills");
  revalidatePath("/budgets");
  revalidatePath("/insights");
  revalidatePath("/net-worth");
  revalidatePath("/reports");
}

export async function updateTransaction(
  _prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing transaction." };

  const parsed = transactionSchema.safeParse({
    amount_minor: orUndefined(formData.get("amount_minor")),
    direction: orUndefined(formData.get("direction")),
    category_id: orUndefined(formData.get("category_id")),
    occurred_on: orUndefined(formData.get("occurred_on")),
    account_id: orUndefined(formData.get("account_id")),
    note: orUndefined(formData.get("note")),
    obligation_id: orUndefined(formData.get("obligation_id")),
    tags: parseTags(orUndefined(formData.get("tags"))),
    is_tax_deductible: String(formData.get("is_tax_deductible") ?? "") === "true",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const input = parsed.data;

  const { error } = await supabase
    .from("transactions")
    .update({
      account_id: input.account_id,
      occurred_on: input.occurred_on,
      direction: input.direction,
      amount_minor: Number(input.amount_minor),
      category_id: input.category_id ?? null,
      note: input.note ?? null,
      obligation_id: input.obligation_id ?? null,
      tags: input.tags ?? [],
      is_tax_deductible: input.is_tax_deductible ?? false,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateAffected();
  return { success: true };
}

export async function deleteTransaction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

/**
 * A short-lived signed URL, fetched on demand rather than stored. The bucket is
 * private, so there is no durable public link to leak, and a 60-second window
 * is plenty to open the file without leaving a shareable URL lying around.
 */
export async function getReceiptUrl(path: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(RECEIPT_BUCKET).createSignedUrl(path, 60);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

export async function attachReceipt(
  transactionId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) return { error: "Pick a file first." };

  const uploadError = await uploadReceipt(supabase, user.id, transactionId, file);
  if (uploadError) return { error: uploadError };

  revalidateAffected();
  return {};
}

export async function bulkDeleteTransactions(ids: string[]): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().in("id", ids);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}

export async function bulkRecategorizeTransactions(
  ids: string[],
  categoryId: string
): Promise<{ error?: string }> {
  if (ids.length === 0) return {};
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").update({ category_id: categoryId }).in("id", ids);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}
