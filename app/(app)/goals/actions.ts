"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addGoal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  const targetAmount = Number(formData.get("targetAmount"));
  const targetDate = String(formData.get("targetDate") ?? "") || null;
  const accountId = String(formData.get("accountId") ?? "") || null;
  const savedSoFar = Number(formData.get("savedSoFar") ?? 0) || 0;

  if (!name || !targetAmount || targetAmount <= 0) return;

  await supabase.from("savings_goals").insert({
    user_id: user.id,
    name,
    target_amount: targetAmount,
    target_date: targetDate,
    account_id: accountId,
    saved_so_far: accountId ? 0 : savedSoFar,
  });

  revalidatePath("/goals");
}

export async function updateGoal(id: string, formData: FormData) {
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const targetAmount = Number(formData.get("targetAmount"));
  const targetDate = String(formData.get("targetDate") ?? "") || null;
  const accountId = String(formData.get("accountId") ?? "") || null;
  const savedSoFar = Number(formData.get("savedSoFar") ?? 0) || 0;

  if (!name || !targetAmount || targetAmount <= 0) return;

  await supabase
    .from("savings_goals")
    .update({
      name,
      target_amount: targetAmount,
      target_date: targetDate,
      account_id: accountId,
      saved_so_far: accountId ? 0 : savedSoFar,
    })
    .eq("id", id);

  revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
  const supabase = await createClient();
  await supabase.from("savings_goals").delete().eq("id", id);
  revalidatePath("/goals");
}
