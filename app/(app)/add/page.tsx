import { createClient } from "@/lib/supabase/server";
import { AddForm } from "@/components/add/AddForm";
import type { Currency } from "@/lib/money";
import type { Category } from "@/lib/categories";
import { daysAgoIso } from "@/lib/date";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ obligation_id?: string; payer_id?: string; amount?: string }>;
}) {
  const { obligation_id, payer_id, amount } = await searchParams;
  const supabase = await createClient();

  const [payersRes, accountsRes, categoriesRes, fxRes, obligationsRes, lastEtbRes, lastUsdRes, recentRes, lastEntryRes] =
    await Promise.all([
    supabase.from("payers").select("id, key, label, is_default").order("is_default", { ascending: false }),
    supabase.from("accounts").select("id, name, currency").eq("is_archived", false),
    supabase
      .from("categories")
      .select("id, name, kind, color, icon, monthly_budget_usd_minor, sort_order, is_archived")
      .eq("is_archived", false)
      .order("sort_order"),
    supabase.from("fx_rates").select("etb_per_usd, effective_on").order("effective_on", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("obligation_progress").select("obligation_id, title, payer_id").in("status", ["open", "partial"]).order("due_on", { ascending: true, nullsFirst: false }),
    supabase.from("transactions").select("account_id").eq("currency", "ETB").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("transactions").select("account_id").eq("currency", "USD").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("transactions")
      .select("category_id")
      .gte("occurred_on", daysAgoIso(90)),
    supabase
      .from("transactions")
      .select("amount_minor, currency, direction, category_id, account_id, payer_id, note")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Keyed by category id -- kind already separates spending from income, so
  // one map covers both directions.
  const categoryUsage: Record<string, number> = {};
  for (const row of recentRes.data ?? []) {
    if (!row.category_id) continue;
    categoryUsage[row.category_id] = (categoryUsage[row.category_id] ?? 0) + 1;
  }

  return (
    <div>
      <h1 className="page-title mb-4">Add</h1>
      <AddForm
        payers={payersRes.data ?? []}
        accounts={(accountsRes.data ?? []) as { id: string; name: string; currency: Currency }[]}
        categories={(categoriesRes.data ?? []) as Category[]}
        fxRate={fxRes.data ?? null}
        obligations={(obligationsRes.data ?? []).filter(
          (o): o is { obligation_id: string; title: string; payer_id: string } =>
            o.obligation_id !== null && o.title !== null && o.payer_id !== null
        )}
        lastAccountByCurrency={{
          ETB: lastEtbRes.data?.account_id ?? null,
          USD: lastUsdRes.data?.account_id ?? null,
        }}
        categoryUsage={categoryUsage}
        defaultCurrency="ETB"
        lastEntry={lastEntryRes.data ?? null}
        initialObligationId={obligation_id}
        initialPayerId={payer_id}
        initialAmount={amount}
      />
    </div>
  );
}
