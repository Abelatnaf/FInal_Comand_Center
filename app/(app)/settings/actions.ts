"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinor } from "@/lib/money";

export type ActionState = { error?: string; success?: boolean } | undefined;

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/add");
  revalidatePath("/bills");
  revalidatePath("/ledger");
  revalidatePath("/settings");
}

export async function setFxRate(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const effectiveOn = String(formData.get("effective_on") ?? "");
  const etbPerUsd = Number(formData.get("etb_per_usd"));
  const source = String(formData.get("source") ?? "");

  if (!effectiveOn) return { error: "Pick a date." };
  if (!(etbPerUsd > 0)) return { error: "Enter a positive rate." };
  if (!["official", "parallel", "manual"].includes(source)) return { error: "Pick a source." };

  const { error } = await supabase
    .from("fx_rates")
    .upsert(
      { user_id: user.id, effective_on: effectiveOn, etb_per_usd: etbPerUsd, source },
      { onConflict: "user_id,effective_on,source" }
    );

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function deleteFxRate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("fx_rates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function addAccount(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const openingBalance = String(formData.get("opening_balance") ?? "0").trim() || "0";

  if (!name) return { error: "Name it." };
  if (!["ETB", "USD"].includes(currency)) return { error: "Pick a currency." };
  if (!["bank", "cash", "processor"].includes(kind)) return { error: "Pick a kind." };

  let openingMinor: bigint;
  try {
    openingMinor = toMinor(openingBalance);
  } catch {
    return { error: "Enter a valid opening balance." };
  }

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name,
    currency,
    kind,
    opening_balance_minor: Number(openingMinor),
  });

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function updateAccountBalance(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const openingBalance = String(formData.get("opening_balance") ?? "0").trim() || "0";
  if (!id) return { error: "Missing account." };

  let openingMinor: bigint;
  try {
    openingMinor = toMinor(openingBalance);
  } catch {
    return { error: "Enter a valid amount." };
  }

  const { error } = await supabase
    .from("accounts")
    .update({ opening_balance_minor: Number(openingMinor) })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function toggleAccountArchived(id: string, archived: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ is_archived: archived }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function deleteAccount(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) {
    return { error: "Can't delete an account with transaction history — archive it instead." };
  }
  revalidateAll();
  return {};
}

export async function updatePayerLabel(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!id || !label) return { error: "Enter a label." };

  const { error } = await supabase.from("payers").update({ label }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function updateTrackingStartDate(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const trackingStartDate = String(formData.get("tracking_start_date") ?? "");
  if (!trackingStartDate) return { error: "Pick a date." };

  const { error } = await supabase
    .from("settings")
    .upsert({ user_id: user.id, tracking_start_date: trackingStartDate }, { onConflict: "user_id" });

  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function createShareLink(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const label = String(formData.get("label") ?? "").trim() || null;

  const { error } = await supabase.from("share_links").insert({ user_id: user.id, label });
  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function revokeShareLink(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("share_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function deleteShareLink(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("share_links").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAll();
  return {};
}

export async function exportAllData(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const [payers, accounts, fxRates, obligations, transactions, settings] = await Promise.all([
    supabase.from("payers").select("*"),
    supabase.from("accounts").select("*"),
    supabase.from("fx_rates").select("*"),
    supabase.from("obligations").select("*"),
    supabase.from("transactions").select("*"),
    supabase.from("settings").select("*"),
  ]);

  return {
    exported_at: new Date().toISOString(),
    payers: payers.data,
    accounts: accounts.data,
    fx_rates: fxRates.data,
    obligations: obligations.data,
    transactions: transactions.data,
    settings: settings.data,
  };
}
