import { PageHeader } from "@/components/glass/Glass";
import { IncomeTable } from "@/components/tables/IncomeTable";
import { createClient } from "@/lib/supabase/server";

export default async function IncomePage() {
  const supabase = await createClient();

  const { data: income } = await supabase
    .from("income")
    .select("id, date, cadet_week, source, currency, amount_original, amount_usd, notes")
    .order("date", { ascending: false });

  return (
    <div>
      <PageHeader eyebrow="VMI FINANCE" title="Income" subtitle="Full table — filter, inline edit, CSV export." />
      <IncomeTable income={income ?? []} />
    </div>
  );
}
