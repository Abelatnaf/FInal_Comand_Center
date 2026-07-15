"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function billFromForm(formData: FormData) {
  return {
    name: String(formData.get("name")),
    category_id: Number(formData.get("category_id")),
    monthly_cost_usd: Number(formData.get("monthly_cost_usd")),
    billing_day: Number(formData.get("billing_day")),
    payment_method: String(formData.get("payment_method")),
    active: formData.get("active") === "on",
  };
}

export async function addRecurringBill(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_bills").insert(billFromForm(formData));
  if (error) return { error: error.message };
  revalidatePath("/recurring-bills");
  revalidatePath("/");
  return { success: true };
}

export async function updateRecurringBill(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_bills").update(billFromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/recurring-bills");
  revalidatePath("/");
  return { success: true };
}

export async function deleteRecurringBill(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_bills").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/recurring-bills");
  revalidatePath("/");
  return { success: true };
}

function recurringIncomeFromForm(formData: FormData) {
  const accountId = String(formData.get("account_id") ?? "") || null;
  return {
    source: String(formData.get("source")),
    amount_usd: Number(formData.get("amount_usd")),
    billing_day: Number(formData.get("billing_day")),
    account_id: accountId,
    active: formData.get("active") === "on",
  };
}

export async function addRecurringIncome(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_income").insert(recurringIncomeFromForm(formData));
  if (error) return { error: error.message };
  revalidatePath("/recurring-bills");
  revalidatePath("/");
  return { success: true };
}

export async function updateRecurringIncome(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_income").update(recurringIncomeFromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/recurring-bills");
  revalidatePath("/");
  return { success: true };
}

export async function deleteRecurringIncome(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_income").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/recurring-bills");
  revalidatePath("/");
  return { success: true };
}
