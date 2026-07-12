"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ImportRow = {
  date: string;
  description: string;
  amount: number;
  isIncome: boolean;
  categoryId: number | null;
};

export type ImportResult = { inserted: number; skipped: number; error?: string };

export async function importRows(
  rows: ImportRow[],
  currency: string,
  necessity: string,
  paymentMethod: string
): Promise<ImportResult> {
  const supabase = await createClient();
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.date || !row.amount || row.amount <= 0) {
      skipped++;
      continue;
    }

    if (row.isIncome) {
      const { data: existing } = await supabase
        .from("income")
        .select("id")
        .eq("date", row.date)
        .eq("amount_original", row.amount)
        .eq("currency", currency)
        .limit(1);
      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }
      const { error } = await supabase.from("income").insert({
        date: row.date,
        source: row.description || "Imported",
        currency,
        amount_original: row.amount,
        notes: "Imported from CSV",
      });
      if (error) return { inserted, skipped, error: error.message };
      inserted++;
    } else {
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("date", row.date)
        .eq("amount_original", row.amount)
        .eq("currency", currency)
        .limit(1);
      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }
      const { error } = await supabase.from("transactions").insert({
        date: row.date,
        category_id: row.categoryId,
        description: row.description || null,
        necessity,
        is_recurring: false,
        currency,
        amount_original: row.amount,
        payment_method: paymentMethod || "Bank of America",
        notes: "Imported from CSV",
      });
      if (error) return { inserted, skipped, error: error.message };
      inserted++;
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/income");
  revalidatePath("/");
  return { inserted, skipped };
}
