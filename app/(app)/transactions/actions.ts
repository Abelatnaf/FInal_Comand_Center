"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient();

  const accountId = String(formData.get("account_id") ?? "") || null;

  const { error } = await supabase
    .from("transactions")
    .update({
      date: String(formData.get("date")),
      category_id: Number(formData.get("category_id")),
      account_id: accountId,
      description: String(formData.get("description") ?? "") || null,
      necessity: String(formData.get("necessity")),
      is_recurring: formData.get("is_recurring") === "on",
      currency: String(formData.get("currency")),
      amount_original: Number(formData.get("amount")),
      payment_method: String(formData.get("payment_method")),
      notes: String(formData.get("notes") ?? "") || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  // Always replace splits with whatever the form submitted: delete the old
  // set, then insert the new one if provided. Absent/empty "splits" means
  // the user turned splitting off, which correctly falls back to this
  // transaction's own category_id via transaction_category_breakdown.
  const { error: deleteSplitsError } = await supabase.from("transaction_splits").delete().eq("transaction_id", id);
  if (deleteSplitsError) return { error: deleteSplitsError.message };

  const splitsRaw = formData.get("splits");
  if (splitsRaw) {
    try {
      const splits: { category_id: number; amount_usd: number }[] = JSON.parse(String(splitsRaw));
      if (splits.length > 1) {
        const { error: splitError } = await supabase
          .from("transaction_splits")
          .insert(splits.map((s) => ({ transaction_id: id, category_id: s.category_id, amount_usd: s.amount_usd })));
        if (splitError) return { error: splitError.message };
      }
    } catch {
      // malformed splits payload — ignore, transaction keeps its single fallback category
    }
  }

  const receipt = formData.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const ext = receipt.name.split(".").pop() || "jpg";
      const path = `${userData.user.id}/${id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(path, receipt, { upsert: true });
      if (!uploadError) {
        await supabase.from("transactions").update({ receipt_path: path }).eq("id", id);
      }
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/");
  if (accountId) revalidatePath(`/accounts/${accountId}`);
  return { success: true };
}

export async function getReceiptUrl(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}

export async function bulkRecategorizeTransactions(ids: string[], categoryId: number) {
  if (ids.length === 0) return { success: true };
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").update({ category_id: categoryId }).in("id", ids);
  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}

export async function bulkDeleteTransactions(ids: string[]) {
  if (ids.length === 0) return { success: true };
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().in("id", ids);
  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}
