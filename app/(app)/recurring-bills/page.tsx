import { PageHeader } from "@/components/glass/Glass";
import { RecurringBillsTable } from "@/components/tables/RecurringBillsTable";
import { createClient } from "@/lib/supabase/server";

export default async function RecurringBillsPage() {
  const supabase = await createClient();

  const [{ data: bills }, { data: categories }] = await Promise.all([
    supabase
      .from("recurring_bills")
      .select("id, name, category_id, monthly_cost_usd, billing_day, payment_method, active, categories(name)")
      .order("name"),
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader
        title="Recurring Bills"
        subtitle="Monthly burn total, upcoming billing dates."
      />
      <RecurringBillsTable bills={bills ?? []} categories={categories ?? []} />
    </div>
  );
}
