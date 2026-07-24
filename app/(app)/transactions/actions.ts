"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRate } from "@/lib/fx";

export async function updateEntry(id: string, formData: FormData) {
  const supabase = await createClient();

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

  if (!date || !typedAmount || typedAmount <= 0 || !description) return;

  // Mirrors the same locked-rate rule as addEntry: if the currency selection
  // is unchanged from what this entry already used, keep its original locked
  // rate (recompute amount from the new typed figure using that same rate)
  // instead of fetching today's rate — editing the number shouldn't silently
  // reprice the entry against a rate that has since moved.
  let amount = typedAmount;
  let entryCurrency: string | null = null;
  let entryOriginalAmount: number | null = null;
  let entryFxRate: number | null = null;

  if (selectedCurrency) {
    const [{ data: settings }, { data: existing }] = await Promise.all([
      supabase.from("settings").select("currency_code").single(),
      supabase.from("entries").select("entry_currency, entry_fx_rate").eq("id", id).single(),
    ]);
    const mainCurrency = settings?.currency_code ?? "USD";

    if (selectedCurrency !== mainCurrency) {
      if (existing?.entry_currency === selectedCurrency && existing.entry_fx_rate) {
        entryFxRate = existing.entry_fx_rate;
      } else {
        entryFxRate = await getExchangeRate(mainCurrency, selectedCurrency);
        if (!entryFxRate) return; // couldn't get a live rate — leave the entry untouched rather than guess
      }
      entryCurrency = selectedCurrency;
      entryOriginalAmount = typedAmount;
      amount = typedAmount / entryFxRate;
    }
  }

  await supabase
    .from("entries")
    .update({
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
    })
    .eq("id", id);

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/goals");
}

export async function deleteEntry(id: string) {
  const supabase = await createClient();
  await supabase.from("entries").delete().eq("id", id);
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/goals");
}
