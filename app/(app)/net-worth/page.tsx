import { PageHeader } from "@/components/glass/Glass";
import { NetWorthTable } from "@/components/tables/NetWorthTable";
import { createClient } from "@/lib/supabase/server";

export default async function NetWorthPage() {
  const supabase = await createClient();

  const { data: snapshots } = await supabase
    .from("net_worth_variance")
    .select("*")
    .order("snapshot_date", { ascending: false });

  const typedSnapshots = (snapshots ?? [])
    .filter((s) => s.id !== null)
    .map((s) => ({
      id: s.id!,
      snapshot_date: s.snapshot_date!,
      sofi_actual: s.sofi_actual ?? 0,
      ally_actual: s.ally_actual ?? 0,
      cash_actual: s.cash_actual ?? 0,
      total_actual: s.total_actual ?? 0,
      computed_balance: s.computed_balance ?? 0,
      variance: s.variance ?? 0,
      notes: s.notes,
    }));

  return (
    <div>
      <PageHeader
        eyebrow="VMI FINANCE"
        title="Net Worth Tracker"
        subtitle="Snapshot log + variance vs. computed balance."
      />
      <NetWorthTable snapshots={typedSnapshots} />
    </div>
  );
}
