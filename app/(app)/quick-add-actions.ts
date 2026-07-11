"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type QuickAddState = { error?: string; success?: boolean } | undefined;

export async function addTransaction(
  _prevState: QuickAddState,
  formData: FormData
): Promise<QuickAddState> {
  const supabase = await createClient();

  const { error } = await supabase.from("transactions").insert({
    date: String(formData.get("date")),
    category_id: Number(formData.get("category_id")),
    description: String(formData.get("description") ?? "") || null,
    necessity: String(formData.get("necessity")),
    is_recurring: formData.get("is_recurring") === "on",
    currency: String(formData.get("currency")),
    amount_original: Number(formData.get("amount")),
    payment_method: String(formData.get("payment_method")),
    notes: String(formData.get("notes") ?? "") || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function addIncome(
  _prevState: QuickAddState,
  formData: FormData
): Promise<QuickAddState> {
  const supabase = await createClient();

  const { error } = await supabase.from("income").insert({
    date: String(formData.get("date")),
    source: String(formData.get("source") ?? "") || null,
    currency: String(formData.get("currency")),
    amount_original: Number(formData.get("amount")),
    notes: String(formData.get("notes") ?? "") || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}
