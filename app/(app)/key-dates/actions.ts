"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function keyDateFromForm(formData: FormData) {
  return {
    event: String(formData.get("event")),
    window_label: String(formData.get("window_label")),
    status: String(formData.get("status")),
    budget_note: String(formData.get("budget_note") ?? "") || null,
  };
}

export async function addKeyDate(formData: FormData) {
  const supabase = await createClient();
  const { count } = await supabase.from("key_dates").select("id", { count: "exact", head: true });
  const { error } = await supabase.from("key_dates").insert({ ...keyDateFromForm(formData), sort_order: (count ?? 0) + 1 });
  if (error) return { error: error.message };
  revalidatePath("/key-dates");
  return { success: true };
}

export async function updateKeyDate(id: number, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("key_dates").update(keyDateFromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/key-dates");
  return { success: true };
}

export async function deleteKeyDate(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("key_dates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/key-dates");
  return { success: true };
}
