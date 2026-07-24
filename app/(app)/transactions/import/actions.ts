"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/supabase/database.types";

export type ImportRow = { date: string; description: string; amount: number; type: "expense" | "income" };
export type ImportResult = { imported: number; skipped: number; error?: string };

export async function importEntries(rows: ImportRow[], accountId: string | null, categoryId: string | null): Promise<ImportResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { imported: 0, skipped: 0, error: "You need to be signed in." };

  const { data: existing } = await supabase.from("entries").select("date, amount, description, type").in("type", ["expense", "income"]);

  const existingKeys = new Set((existing ?? []).map((e) => `${e.date}|${e.type}|${Math.abs(e.amount).toFixed(2)}|${e.description}`));

  const toInsert: TablesInsert<"entries">[] = [];
  let skipped = 0;

  for (const row of rows) {
    const key = `${row.date}|${row.type}|${row.amount.toFixed(2)}|${row.description}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    existingKeys.add(key); // guard against duplicate rows within the same file
    toInsert.push({
      user_id: user.id,
      type: row.type,
      date: row.date,
      amount: row.amount,
      description: row.description || "Imported entry",
      account_id: accountId,
      category_id: row.type === "expense" ? categoryId : null,
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("entries").insert(toInsert);
    if (error) return { imported: 0, skipped, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/budgets");
  revalidatePath("/goals");

  return { imported: toInsert.length, skipped };
}
