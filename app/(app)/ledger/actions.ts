"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transactionSchema } from "@/lib/schemas/transaction";

export type TransactionFormState = { error?: string; success?: boolean } | undefined;

function orUndefined(value: FormDataEntryValue | null): string | undefined {
  const s = String(value ?? "").trim();
  return s === "" ? undefined : s;
}

function revalidateAffected() {
  revalidatePath("/");
  revalidatePath("/ledger");
  revalidatePath("/bills");
}

export async function updateTransaction(
  _prevState: TransactionFormState,
  formData: FormData
): Promise<TransactionFormState> {
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing transaction." };

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

  const { error } = await supabase
    .from("transactions")
    .update({
      payer_id: input.payer_id,
      account_id: input.account_id,
      occurred_on: input.occurred_on,
      direction: input.direction,
      amount_minor: Number(input.amount_minor),
      currency: input.currency,
      category: input.category ?? null,
      note: input.note ?? null,
      obligation_id: input.obligation_id ?? null,
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidateAffected();
  return { success: true };
}

export async function deleteTransaction(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateAffected();
  return {};
}
