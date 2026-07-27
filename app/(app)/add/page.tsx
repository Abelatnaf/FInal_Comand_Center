import { createClient } from "@/lib/supabase/server";
import { AddForm } from "@/components/add/AddForm";
import type { Currency } from "@/lib/money";
import { daysAgoIso } from "@/lib/date";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ obligation_id?: string; payer_id?: string }>;
}) {
  const { obligation_id, payer_id } = await searchParams;
  const supabase = await createClient();

  const [payersRes, accountsRes, fxRes, obligationsRes, lastEtbRes, lastUsdRes, recentRes] = await Promise.all([
    supabase.from("payers").select("id, key, label, is_default").order("is_default", { ascending: false }),
    supabase.from("accounts").select("id, name, currency").eq("is_archived", false),
    supabase.from("fx_rates").select("etb_per_usd, effective_on").order("effective_on", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("obligation_progress").select("obligation_id, title, payer_id").in("status", ["open", "partial"]).order("due_on", { ascending: true, nullsFirst: false }),
    supabase.from("transactions").select("account_id").eq("currency", "ETB").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("transactions").select("account_id").eq("currency", "USD").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("transactions")
      .select("category, direction")
      .gte("occurred_on", daysAgoIso(90)),
  ]);

  const categoryUsage: { in: Record<string, number>; out: Record<string, number> } = { in: {}, out: {} };
  for (const row of recentRes.data ?? []) {
    if (!row.category) continue;
    const bucket = row.direction === "in" ? categoryUsage.in : categoryUsage.out;
    bucket[row.category] = (bucket[row.category] ?? 0) + 1;
  }

  return (
    <div>
      <h1 className="text-[20px] font-semibold text-text mb-4">Add</h1>
      <AddForm
        payers={payersRes.data ?? []}
        accounts={(accountsRes.data ?? []) as { id: string; name: string; currency: Currency }[]}
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
        initialObligationId={obligation_id}
        initialPayerId={payer_id}
      />
    </div>
  );
}
