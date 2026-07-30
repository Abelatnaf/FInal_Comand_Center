"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/schemas/transaction";
import { uploadReceipt } from "@/lib/receipts";

export type CreateTransactionState =
  | { error?: string; success?: boolean; receiptError?: string }
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
    currency: orUndefined(formData.get("currency")),
    direction: orUndefined(formData.get("direction")),
    category: orUndefined(formData.get("category")),
    occurred_on: orUndefined(formData.get("occurred_on")),
    account_id: orUndefined(formData.get("account_id")),
    payer_id: orUndefined(formData.get("payer_id")),
    note: orUndefined(formData.get("note")),
    obligation_id: orUndefined(formData.get("obligation_id")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const input = parsed.data;

  // fx_rate_etb_per_usd / amount_usd_minor are required by the generated
  // Insert type (the columns have no SQL default) but are always computed
  // and frozen by the BEFORE INSERT trigger. The trigger only honours a
  // caller-supplied rate for the database owner (the restore path), never for
  // an `authenticated` client, so these placeholders are always overwritten.
  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      payer_id: input.payer_id,
      account_id: input.account_id,
      occurred_on: input.occurred_on,
      direction: input.direction,
      amount_minor: Number(input.amount_minor),
      currency: input.currency,
      category: input.category ?? null,
      note: input.note ?? null,
      obligation_id: input.obligation_id ?? null,
      fx_rate_etb_per_usd: 0,
      amount_usd_minor: 0,
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
  return { success: true };
}
