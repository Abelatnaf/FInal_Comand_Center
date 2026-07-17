"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createBackupNow() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_backup_for_user");
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function getBackupData(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("data_backups").select("data, created_at").eq("id", id).single();
  if (error) return { error: error.message };
  return { data: data.data, createdAt: data.created_at };
}

export async function deleteBackup(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("data_backups").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function restoreBackup(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("restore_from_backup", { p_backup_id: id });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { success: true };
}
