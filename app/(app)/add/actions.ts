"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema, parseTags } from "@/lib/schemas/transaction";
import { uploadReceipt } from "@/lib/receipts";

export type CreateTransactionState =
  | { error?: string; success?: boolean; receiptError?: string; duplicateWarning?: boolean }
  | undefined;

function orUndefined(value: FormDataEntryValue | null): string | undefined {
  const s = String(value ?? "").trim();
  return s === "" ? undefined : s;
}

// Returns {success} rather than redirecting -- this is also called
// directly (bypassing the form) by lib/offline/sync.ts to replay queued
// entries once back online, where a redirect would be a jarring, unwanted
// navigation away from whatever page the user is actually on.
export async function createTransaction(
  _prevState: CreateTransactionState,
  formData: FormData
): Promise<CreateTransactionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const parsed = transactionSchema.safeParse({
    amount_minor: orUndefined(formData.get("amount_minor")),
    direction: orUndefined(formData.get("direction")),
    category_id: orUndefined(formData.get("category_id")),
    occurred_on: orUndefined(formData.get("occurred_on")),
    account_id: orUndefined(formData.get("account_id")),
    note: orUndefined(formData.get("note")),
    obligation_id: orUndefined(formData.get("obligation_id")),
    tags: parseTags(orUndefined(formData.get("tags"))),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const input = parsed.data;

  // Warn, don't block. Logging the same coffee twice in a day is real, so this
  // can't be a hard rule -- but silently double-recording a bill payment is a
  // genuinely costly mistake, and v1/v2 both had this guard before v3 lost it.
  // The client resubmits with confirm_duplicate once the user has seen it.
  if (String(formData.get("confirm_duplicate") ?? "") !== "true") {
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("occurred_on", input.occurred_on)
      .eq("amount_minor", Number(input.amount_minor))
      .eq("direction", input.direction)
      .eq("account_id", input.account_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return { duplicateWarning: true };
    }
  }

  // category_id is left null when nothing was picked rather than defaulted
  // here -- the database trigger applies the user's auto-categorisation rules
  // to a null category, and doing it in this one action would skip the import,
  // recurring-post and offline-replay paths.
  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      account_id: input.account_id,
      occurred_on: input.occurred_on,
      direction: input.direction,
      amount_minor: Number(input.amount_minor),
      category_id: input.category_id ?? null,
      note: input.note ?? null,
      obligation_id: input.obligation_id ?? null,
      tags: input.tags ?? [],
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // The receipt is uploaded after the row exists so its path can include the
  // transaction id. A failed upload is reported but does NOT fail the entry --
  // the money is already recorded correctly, and losing the transaction over a
  // missing attachment would be the worse outcome.
  const receipt = formData.get("receipt");
  if (inserted && receipt instanceof File && receipt.size > 0) {
    const uploadError = await uploadReceipt(supabase, user.id, inserted.id, receipt);
    if (uploadError) {
      revalidatePath("/");
      revalidatePath("/ledger");
      revalidatePath("/bills");
      return { success: true, receiptError: uploadError };
    }
  }

  revalidatePath("/");
  revalidatePath("/ledger");
  revalidatePath("/bills");
  revalidatePath("/budgets");
  revalidatePath("/insights");
  return { success: true };
}
