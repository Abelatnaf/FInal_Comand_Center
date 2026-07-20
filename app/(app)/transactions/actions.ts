"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateEntry(id: string, formData: FormData) {
  const supabase = await createClient();

  const type = String(formData.get("type") ?? "expense");
  const date = String(formData.get("date") ?? "");
  const amount = Number(formData.get("amount"));
  const description = String(formData.get("description") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "") || null;
  const toAccountId = String(formData.get("toAccountId") ?? "") || null;
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const isRecurring = formData.get("isRecurring") === "on";

  if (!date || !amount || amount <= 0 || !description) return;

  await supabase
    .from("entries")
    .update({
      type,
      date,
      amount,
      description,
      account_id: accountId,
      to_account_id: type === "transfer" ? toAccountId : null,
      category_id: type === "expense" ? categoryId : null,
      notes,
      is_recurring: type === "transfer" ? false : isRecurring,
    })
    .eq("id", id);

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/goals");
}

export async function deleteEntry(id: string) {
  const supabase = await createClient();
  await supabase.from("entries").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/goals");
}
