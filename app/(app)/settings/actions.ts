"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; success?: boolean } | undefined;

export async function updateSettings(_prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("settings")
    .update({
      fx_rate: Number(formData.get("fx_rate")),
      matriculation_date: String(formData.get("matriculation_date")),
      starting_sofi: Number(formData.get("starting_sofi") ?? 0),
      starting_ally: Number(formData.get("starting_ally") ?? 0),
      starting_cash: Number(formData.get("starting_cash") ?? 0),
    })
    .eq("id", 1);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}
