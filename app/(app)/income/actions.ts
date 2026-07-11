"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateIncome(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("income")
    .update({
      date: String(formData.get("date")),
      source: String(formData.get("source") ?? "") || null,
      currency: String(formData.get("currency")),
      amount_original: Number(formData.get("amount")),
      notes: String(formData.get("notes") ?? "") || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/income");
  revalidatePath("/");
  return { success: true };
}

export async function deleteIncome(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("income").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/income");
  revalidatePath("/");
  return { success: true };
}
