"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function dismissOnboarding() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("settings")
    .update({ onboarding_dismissed: true })
    .eq("user_id", userData.user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}
