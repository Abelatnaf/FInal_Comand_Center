"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function periodFromForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    start_date: String(formData.get("start_date")),
    end_date: String(formData.get("end_date")),
  };
}

export async function addPeriod(formData: FormData) {
  const supabase = await createClient();
  const period = periodFromForm(formData);
  if (!period.name) return { error: "Name is required." };
  const { error } = await supabase.from("semesters").insert(period);
  if (error) return { error: error.message };
  revalidatePath("/semester-planner");
  return { success: true };
}

export async function updatePeriod(id: number, formData: FormData) {
  const supabase = await createClient();
  const period = periodFromForm(formData);
  if (!period.name) return { error: "Name is required." };
  const { error } = await supabase.from("semesters").update(period).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/semester-planner");
  return { success: true };
}

export async function deletePeriod(id: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("semesters").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/semester-planner");
  return { success: true };
}
