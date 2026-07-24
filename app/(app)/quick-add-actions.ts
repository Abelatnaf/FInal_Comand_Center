"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRate } from "@/lib/fx";

export type AddEntryState = { error?: string } | undefined;

export async function addEntry(_prevState: AddEntryState, formData: FormData): Promise<AddEntryState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const type = String(formData.get("type") ?? "expense");
  const date = String(formData.get("date") ?? "");
  const typedAmount = Number(formData.get("amount"));
  const description = String(formData.get("description") ?? "").trim();
  const accountId = String(formData.get("accountId") ?? "") || null;
  const toAccountId = String(formData.get("toAccountId") ?? "") || null;
  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const isRecurring = formData.get("isRecurring") === "on";
  const selectedCurrency = String(formData.get("currency") ?? "") || null;

  if (!date) return { error: "Pick a date." };
  if (!typedAmount || typedAmount <= 0) return { error: "Enter an amount greater than 0." };
  if (!description) return { error: "Add a short description." };
  if (type === "transfer" && (!accountId || !toAccountId || accountId === toAccountId)) {
    return { error: "Pick two different accounts to transfer between." };
  }

  // If the entry was typed in a currency other than the main one (e.g. logging
  // directly in ETB), convert to the main currency for storage but keep the
  // original figure and the rate used, so it's never silently repriced later.
  let amount = typedAmount;
  let entryCurrency: string | null = null;
  let entryOriginalAmount: number | null = null;
  let entryFxRate: number | null = null;

  if (selectedCurrency) {
    const { data: settings } = await supabase.from("settings").select("currency_code").single();
    const mainCurrency = settings?.currency_code ?? "USD";
    if (selectedCurrency !== mainCurrency) {
      const rate = await getExchangeRate(mainCurrency, selectedCurrency);
      if (!rate) return { error: "Couldn't fetch a live exchange rate right now — try again in a moment." };
      entryCurrency = selectedCurrency;
      entryOriginalAmount = typedAmount;
      entryFxRate = rate;
      amount = typedAmount / rate;
    }
  }

  const { error } = await supabase.from("entries").insert({
    user_id: user.id,
    type,
    date,
    amount,
    description,
    account_id: accountId,
    to_account_id: type === "transfer" ? toAccountId : null,
    category_id: type === "expense" ? categoryId : null,
    notes,
    is_recurring: type === "transfer" ? false : isRecurring,
    entry_currency: entryCurrency,
    entry_original_amount: entryOriginalAmount,
    entry_fx_rate: entryFxRate,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/goals");
}
