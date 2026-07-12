"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateTransfer(id: string, formData: FormData) {
  const supabase = await createClient();

  const fromAccountId = String(formData.get("from_account_id"));
  const toAccountId = String(formData.get("to_account_id"));
  if (fromAccountId === toAccountId) {
    return { error: "Pick two different accounts." };
  }

  const { error } = await supabase
    .from("transfers")
    .update({
      date: String(formData.get("date")),
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount_usd: Number(formData.get("amount")),
      notes: String(formData.get("notes") ?? "") || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/transfers");
  revalidatePath("/");
  return { success: true };
}

export async function deleteTransfer(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transfers").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/transfers");
  revalidatePath("/");
  return { success: true };
}
