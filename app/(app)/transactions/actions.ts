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

  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/transactions");
  revalidatePath("/");
  return { success: true };
}
