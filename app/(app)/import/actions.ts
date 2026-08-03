"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ImportRow = {
  occurred_on: string;
  note: string;
  amount_minor: number;
  direction: "in" | "out";
};

export type ImportResult = { error?: string; imported?: number; skipped?: number };

/**
 * Inserts the previewed rows, skipping any that already exist.
 *
 * The duplicate check is the important part: re-uploading a statement, or one
 * whose date range overlaps a previous upload, is completely normal and must
 * not double-count. Same date + same amount + same direction + same account is
 * treated as already-logged.
 *
 * Categories are deliberately left null. The transactions trigger applies the
 * user's auto-categorisation rules on insert, so imported rows get filed by
 * the same rules as everything else rather than by a second implementation.
 */
export async function importTransactions(
  accountId: string,
  rows: ImportRow[]
): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!accountId) return { error: "Pick an account to import into." };
  if (rows.length === 0) return { error: "Nothing to import." };
  if (rows.length > 2000) return { error: "That's more than 2,000 rows — split the file up." };

  const dates = rows.map((r) => r.occurred_on).sort();

  // One query for the whole date range, rather than one per row.
  const { data: existing, error: readError } = await supabase
    .from("transactions")
    .select("occurred_on, amount_minor, direction")
    .eq("account_id", accountId)
    .gte("occurred_on", dates[0])
    .lte("occurred_on", dates[dates.length - 1]);

  if (readError) return { error: readError.message };

  const seen = new Set(
    (existing ?? []).map((t) => `${t.occurred_on}|${t.amount_minor}|${t.direction}`)
  );

  const toInsert = [];
  let skipped = 0;
  for (const row of rows) {
    const key = `${row.occurred_on}|${row.amount_minor}|${row.direction}`;
    // Also guards against duplicates inside the file itself, not just against
    // what's already saved.
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    toInsert.push({
      user_id: user.id,
      account_id: accountId,
      occurred_on: row.occurred_on,
      direction: row.direction,
      amount_minor: row.amount_minor,
      note: row.note || null,
      category_id: null,
    });
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("transactions").insert(toInsert);
    if (error) return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/ledger");
  revalidatePath("/budgets");
  revalidatePath("/insights");
  revalidatePath("/net-worth");

  return { imported: toInsert.length, skipped };
}
