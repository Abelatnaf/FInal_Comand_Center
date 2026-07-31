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
  const name = String(formData.get("name") ?? "").trim();
  if (!id) return { error: "Missing account." };
  if (!name) return { error: "An account needs a name." };

  let openingMinor: bigint;
  try {
    openingMinor = toMinor(openingBalance);
  } catch {
    return { error: "Enter a valid amount." };
  }

  // Currency is deliberately not editable: existing transactions on this
  // account are stored in its currency and the database enforces the match,
  // so changing it would either fail or silently misrepresent history.
  const { error } = await supabase
    .from("accounts")
    .update({ opening_balance_minor: Number(openingMinor), name })
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

export async function addPayer(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Name the payer." };

  // `key` is unique per user and is only an internal handle, so derive it from
  // the label and disambiguate rather than asking for it. Two payers called
  // the same thing is the user's business, but their keys still can't collide.
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "payer";
  const { data: existing } = await supabase.from("payers").select("key");
  const taken = new Set((existing ?? []).map((p) => p.key));
  let key = base;
  for (let i = 2; taken.has(key); i++) key = `${base}-${i}`;

  const { error } = await supabase.from("payers").insert({ user_id: user.id, key, label });
  if (error) return { error: error.message };
  revalidateAll();
  return { success: true };
}

export async function deletePayer(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("payers").delete().eq("id", id);
  if (error) {
    // payer_id is ON DELETE RESTRICT on both transactions and obligations, so
    // this fires whenever the payer has any history -- say what to do about it
    // rather than surfacing a raw constraint error.
    return { error: "This payer is used by existing entries or bills, so it can't be deleted." };
  }
  revalidateAll();
  return {};
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

/**
 * Hands the whole backup to a single database function rather than replaying
 * inserts from here. Two reasons, both load-bearing:
 *
 *  - It's atomic. A restore that half-applied would leave the ledger in a state
 *    worse than either the backup or the current data.
 *  - Only the database can write historical FX rates faithfully. The freeze
 *    trigger looks up today's rate for any client insert, so restoring from
 *    here would silently reprice every historical ETB entry.
 */
export async function restoreFromBackup(payload: unknown): Promise<{ error?: string; counts?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("restore_from_backup", {
    p_backup: payload as never,
  });

  if (error) return { error: error.message };
  revalidateAll();

  const counts = data as Record<string, number> | null;
  if (!counts) return {};
  return {
    counts: Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(", "),
  };
}

export async function exportAllData(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const [payers, accounts, fxRates, obligations, installments, transfers, transactions, settings] =
    await Promise.all([
      supabase.from("payers").select("*"),
      supabase.from("accounts").select("*"),
      supabase.from("fx_rates").select("*"),
      supabase.from("obligations").select("*"),
      supabase.from("obligation_installments").select("*"),
      supabase.from("transfers").select("*"),
      supabase.from("transactions").select("*"),
      supabase.from("settings").select("*"),
    ]);

  // Every table restore_from_backup() reads has to be here, or a backup won't
  // round-trip -- an export that silently omits a table is a broken backup.
  return {
    exported_at: new Date().toISOString(),
    payers: payers.data,
    accounts: accounts.data,
    fx_rates: fxRates.data,
    obligations: obligations.data,
    obligation_installments: installments.data,
    transfers: transfers.data,
    transactions: transactions.data,
    settings: settings.data,
  };
}
