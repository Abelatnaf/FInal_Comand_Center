"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function balancesFromForm(formData: FormData) {
  const balances: { account_id: string; amount: number }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("account_")) continue;
    const account_id = key.slice("account_".length);
    const amount = Number(value);
    if (Number.isNaN(amount)) continue;
    balances.push({ account_id, amount });
  }
  return balances;
}

export async function addNetWorthSnapshot(formData: FormData) {
  const supabase = await createClient();

  const { data: snapshot, error } = await supabase
    .from("net_worth_snapshots")
    .insert({
      snapshot_date: String(formData.get("snapshot_date")),
      notes: String(formData.get("notes") ?? "") || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const balances = balancesFromForm(formData);
  if (balances.length > 0) {
    const { error: balancesError } = await supabase
      .from("net_worth_snapshot_balances")
      .insert(balances.map((b) => ({ ...b, snapshot_id: snapshot.id })));
    if (balancesError) return { error: balancesError.message };
  }

  revalidatePath("/net-worth");
  return { success: true };
}

export async function updateNetWorthSnapshot(id: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("net_worth_snapshots")
    .update({
      snapshot_date: String(formData.get("snapshot_date")),
      notes: String(formData.get("notes") ?? "") || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  const balances = balancesFromForm(formData);
  for (const b of balances) {
    const { error: upsertError } = await supabase
      .from("net_worth_snapshot_balances")
      .upsert({ snapshot_id: id, account_id: b.account_id, amount: b.amount }, { onConflict: "snapshot_id,account_id" });
    if (upsertError) return { error: upsertError.message };
  }

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
