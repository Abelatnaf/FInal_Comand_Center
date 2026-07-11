"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function snapshotFromForm(formData: FormData) {
  return {
    snapshot_date: String(formData.get("snapshot_date")),
    sofi_actual: Number(formData.get("sofi_actual") ?? 0),
    ally_actual: Number(formData.get("ally_actual") ?? 0),
    cash_actual: Number(formData.get("cash_actual") ?? 0),
    notes: String(formData.get("notes") ?? "") || null,
  };
}

export async function addNetWorthSnapshot(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("net_worth_snapshots").insert(snapshotFromForm(formData));
  if (error) return { error: error.message };
  revalidatePath("/net-worth");
  return { success: true };
}

export async function updateNetWorthSnapshot(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("net_worth_snapshots").update(snapshotFromForm(formData)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/net-worth");
  return { success: true };
}

export async function deleteNetWorthSnapshot(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("net_worth_snapshots").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/net-worth");
  return { success: true };
}
