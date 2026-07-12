import { PageHeader } from "@/components/glass/Glass";
import { NetWorthTable } from "@/components/tables/NetWorthTable";
import { createClient } from "@/lib/supabase/server";

export default async function NetWorthPage() {
  const supabase = await createClient();

  const [{ data: variance }, { data: accounts }, { data: detail }] = await Promise.all([
    supabase.from("net_worth_variance").select("*").order("snapshot_date", { ascending: false }),
    supabase.from("accounts").select("id, name, kind").order("sort_order"),
    supabase.from("net_worth_snapshot_detail").select("snapshot_id, account_id, amount"),
  ]);

  const typedSnapshots = (variance ?? [])
    .filter((s) => s.id !== null)
    .map((s) => {
      const balances = Object.fromEntries(
        (detail ?? []).filter((d) => d.snapshot_id === s.id).map((d) => [d.account_id!, d.amount ?? 0])
      );
      return {
        id: s.id!,
        snapshot_date: s.snapshot_date!,
        balances,
        total_actual: s.total_actual ?? 0,
        computed_balance: s.computed_balance ?? 0,
        variance: s.variance ?? 0,
        notes: s.notes,
      };
    });

  return (
    <div>
      <PageHeader title="Net Worth Tracker" subtitle="Snapshot log + variance vs. computed balance." />
      <NetWorthTable snapshots={typedSnapshots} accounts={accounts ?? []} />
    </div>
  );
}
