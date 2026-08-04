import { createClient } from "@/lib/supabase/server";
import { SplitManager, type ShareRow } from "@/components/split/SplitManager";
import { daysAgoIso } from "@/lib/date";

export const metadata = { title: "Split" };

export default async function SplitPage() {
  const supabase = await createClient();

  const [sharesRes, expensesRes, accountsRes] = await Promise.all([
    supabase
      .from("split_shares")
      .select("id, person, amount_minor, settled_at, transactions!split_shares_transaction_id_fkey(occurred_on, note, amount_minor)")
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("id, occurred_on, note, amount_minor")
      .eq("direction", "out")
      .gte("occurred_on", daysAgoIso(60))
      .order("occurred_on", { ascending: false })
      .limit(50),
    supabase.from("accounts").select("id, name").eq("is_archived", false).order("name"),
  ]);

  type Embedded = { occurred_on: string; note: string | null; amount_minor: number } | null;

  const shares: ShareRow[] = (sharesRes.data ?? []).map((s) => {
    const tx = s.transactions as Embedded;
    return {
      id: s.id,
      person: s.person,
      amount_minor: s.amount_minor,
      settled_at: s.settled_at,
      occurred_on: tx?.occurred_on ?? "",
      note: tx?.note ?? null,
      transaction_amount_minor: tx?.amount_minor ?? 0,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Split</h1>
        <p className="text-[14px] text-muted mt-0.5">What roommates and friends owe you</p>
      </div>
      <SplitManager
        shares={shares}
        recentExpenses={expensesRes.data ?? []}
        accounts={accountsRes.data ?? []}
      />
    </div>
  );
}
