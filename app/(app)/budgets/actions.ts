"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateCategoryBudget(categoryId: string, formData: FormData) {
  const supabase = await createClient();
  const amount = Number(formData.get("monthlyBudget"));
  if (Number.isNaN(amount) || amount < 0) return;

  await supabase.from("categories").update({ monthly_budget: amount }).eq("id", categoryId);
  revalidatePath("/budgets");
  revalidatePath("/");
}

export async function logRecurringNow(entryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: source } = await supabase
    .from("entries")
    .select("type, amount, description, notes, account_id, to_account_id, category_id")
    .eq("id", entryId)
    .single();
  if (!source) return;

  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  await supabase.from("entries").insert({
    user_id: user.id,
    type: source.type,
    date,
    amount: source.amount,
    description: source.description,
    notes: source.notes,
    account_id: source.account_id,
    to_account_id: source.to_account_id,
    category_id: source.category_id,
    is_recurring: true,
  });

  revalidatePath("/budgets");
  revalidatePath("/");
  revalidatePath("/transactions");
}
