"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CloseActionState = { error?: string; success?: boolean } | undefined;

function monthStart(periodMonth: string) {
  // periodMonth arrives as "YYYY-MM" — normalize to the first of that month.
  return `${periodMonth}-01`;
}

export async function saveReconciliation(
  periodMonth: string,
  rows: { accountId: string; statementBalance: number | null; computedBalance: number | null; reconciled: boolean }[]
): Promise<CloseActionState> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in." };

  const { data: pc, error: pcError } = await supabase
    .from("period_closes")
    .upsert(
      { user_id: userData.user.id, period_month: monthStart(periodMonth) },
      { onConflict: "user_id,period_month", ignoreDuplicates: false }
    )
    .select("id, status")
    .single();
  if (pcError) return { error: pcError.message };
  if (pc.status === "closed") return { error: "This month is closed. Reopen it before editing reconciliation." };

  for (const row of rows) {
    const { error } = await supabase.from("period_close_accounts").upsert(
      {
        period_close_id: pc.id,
        account_id: row.accountId,
        statement_balance: row.statementBalance,
        computed_balance: row.computedBalance,
        reconciled: row.reconciled,
      },
      { onConflict: "period_close_id,account_id" }
    );
    if (error) return { error: error.message };
  }

  revalidatePath("/close");
  return { success: true };
}

export async function closeMonth(periodMonth: string): Promise<CloseActionState> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in." };

  const { data: pc, error: pcError } = await supabase
    .from("period_closes")
    .select("id, period_close_accounts(reconciled)")
    .eq("period_month", monthStart(periodMonth))
    .single();
  if (pcError || !pc) return { error: "Save reconciliation progress for every account before closing." };

  const rows = pc.period_close_accounts as { reconciled: boolean }[];
  if (rows.length === 0 || rows.some((r) => !r.reconciled)) {
    return { error: "Every account must be marked reconciled before closing the month." };
  }

  const { error } = await supabase
    .from("period_closes")
    .update({ status: "closed", closed_at: new Date().toISOString(), reopen_reason: null })
    .eq("id", pc.id);
  if (error) return { error: error.message };

  revalidatePath("/close");
  return { success: true };
}

export async function reopenMonth(periodMonth: string, reason: string): Promise<CloseActionState> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in." };
  if (!reason.trim()) return { error: "A reason is required to reopen a closed month." };

  const { error } = await supabase
    .from("period_closes")
    .update({ status: "reconciling", reopen_reason: reason.trim() })
    .eq("user_id", userData.user.id)
    .eq("period_month", monthStart(periodMonth));
  if (error) return { error: error.message };

  revalidatePath("/close");
  return { success: true };
}
