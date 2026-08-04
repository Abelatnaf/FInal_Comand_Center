import { createClient } from "@/lib/supabase/server";
import { AddForm } from "@/components/add/AddForm";
import type { Category } from "@/lib/categories";
import { daysAgoIso } from "@/lib/date";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ obligation_id?: string; amount?: string }>;
}) {
  const { obligation_id, amount } = await searchParams;
  const supabase = await createClient();

  const [accountsRes, categoriesRes, obligationsRes, lastAccountRes, recentRes, lastEntryRes] =
    await Promise.all([
      supabase.from("accounts").select("id, name, kind").eq("is_archived", false).order("name"),
      supabase
        .from("categories")
        .select("id, name, kind, color, icon, budget_usd_minor, sort_order, is_archived")
        .eq("is_archived", false)
        .order("sort_order"),
      supabase
        .from("obligation_progress")
        .select("obligation_id, title")
        .in("status", ["open", "partial"])
        .order("due_on", { ascending: true, nullsFirst: false }),
      supabase
        .from("transactions")
        .select("account_id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("transactions").select("category_id, note, tags").gte("occurred_on", daysAgoIso(90)),
      supabase
        .from("transactions")
        .select("amount_minor, direction, category_id, account_id, note")
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // Keyed by category id -- kind already separates spending from income, so
  // one map covers both directions.
  const categoryUsage: Record<string, number> = {};
  const noteCounts = new Map<string, number>();
  const tagSet = new Set<string>();
  for (const row of recentRes.data ?? []) {
    if (row.category_id) {
      categoryUsage[row.category_id] = (categoryUsage[row.category_id] ?? 0) + 1;
    }
    const note = row.note?.trim();
    if (note) noteCounts.set(note, (noteCounts.get(note) ?? 0) + 1);
    for (const tag of row.tags ?? []) tagSet.add(tag);
  }

  // Most-repeated descriptions first: the whole point of the autocomplete is
  // that the merchant you buy from weekly is the first thing offered.
  const recentNotes = [...noteCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([note]) => note);

  return (
    <div>
      <h1 className="page-title mb-4">Add</h1>
      <AddForm
        accounts={accountsRes.data ?? []}
        categories={(categoriesRes.data ?? []) as Category[]}
        obligations={(obligationsRes.data ?? []).filter(
          (o): o is { obligation_id: string; title: string } =>
            o.obligation_id !== null && o.title !== null
        )}
        lastAccountId={lastAccountRes.data?.account_id ?? null}
        categoryUsage={categoryUsage}
        recentNotes={recentNotes}
        knownTags={[...tagSet].sort()}
        lastEntry={lastEntryRes.data ?? null}
        initialObligationId={obligation_id}
        initialAmount={amount}
      />
    </div>
  );
}
