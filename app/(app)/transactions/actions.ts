"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateTransaction(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("transactions")
    .update({
      date: String(formData.get("date")),
      category_id: Number(formData.get("category_id")),
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
