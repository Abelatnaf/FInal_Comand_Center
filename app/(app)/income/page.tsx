import { PageHeader } from "@/components/glass/Glass";
import { IncomeTable } from "@/components/tables/IncomeTable";
import { createClient } from "@/lib/supabase/server";

export default async function IncomePage() {
  const supabase = await createClient();

  const [{ data: income }, { data: currencies }] = await Promise.all([
    supabase
      .from("income")
      .select("id, date, week_number, source, currency, amount_original, amount_usd, notes")
      .order("date", { ascending: false }),
    supabase.from("currencies").select("code, name, rate_to_usd").order("code"),
  ]);

  return (
    <div>
      <PageHeader title="Income" subtitle="Full table — filter, inline edit, CSV export." />
      <IncomeTable income={income ?? []} currencies={currencies ?? []} />
    </div>
  );
}
