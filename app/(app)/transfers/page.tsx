import { PageHeader } from "@/components/glass/Glass";
import { TransfersTable } from "@/components/tables/TransfersTable";
import { createClient } from "@/lib/supabase/server";

export default async function TransfersPage() {
  const supabase = await createClient();

  const [{ data: transfers }, { data: accounts }] = await Promise.all([
    supabase.from("transfers").select("id, date, from_account_id, to_account_id, amount_usd, notes").order("date", { ascending: false }),
    supabase.from("accounts").select("id, name").order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader title="Transfers" subtitle="Moving your own money between your own accounts — this never counts as spending or income." />
      <TransfersTable transfers={transfers ?? []} accounts={accounts ?? []} />
    </div>
  );
}
