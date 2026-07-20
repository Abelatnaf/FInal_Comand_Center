"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AddEntryState = { error?: string } | undefined;

export async function addEntry(_prevState: AddEntryState, formData: FormData): Promise<AddEntryState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const type = String(formData.get("type") ?? "expense");
  const date = String(formData.get("date") ?? "");
  const amount = Number(formData.get("amount"));
  const description = String(formData.get("description") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "") || null;
  const toAccountId = String(formData.get("toAccountId") ?? "") || null;
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const isRecurring = formData.get("isRecurring") === "on";

  if (!date) return { error: "Pick a date." };
  if (!amount || amount <= 0) return { error: "Enter an amount greater than $0." };
  if (!description) return { error: "Add a short description." };
  if (type === "transfer" && (!accountId || !toAccountId || accountId === toAccountId)) {
    return { error: "Pick two different accounts to transfer between." };
  }

  const { error } = await supabase.from("entries").insert({
    user_id: user.id,
    type,
    date,
    amount,
    description,
    account_id: accountId,
    to_account_id: type === "transfer" ? toAccountId : null,
    category_id: type === "expense" ? categoryId : null,
    notes,
    is_recurring: type === "transfer" ? false : isRecurring,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/goals");
}
