import { PageHeader } from "@/components/glass/Glass";
import { RecurringBillsTable } from "@/components/tables/RecurringBillsTable";
import { RecurringIncomeTable } from "@/components/tables/RecurringIncomeTable";
import { createClient } from "@/lib/supabase/server";

export default async function RecurringBillsPage() {
  const supabase = await createClient();

  const [{ data: bills }, { data: categories }, { data: income }, { data: accounts }] = await Promise.all([
    supabase
      .from("recurring_bills")
      .select("id, name, category_id, monthly_cost_usd, billing_day, payment_method, active, categories(name)")
      .order("name"),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("recurring_income").select("id, source, amount_usd, billing_day, account_id, active").order("source"),
    supabase.from("accounts").select("id, name").order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader
        title="Recurring"
        subtitle="Bills auto-post as a transaction, income auto-posts as a deposit — both on their day of the month."
      />
      <div className="flex flex-col gap-5">
        <RecurringBillsTable bills={bills ?? []} categories={categories ?? []} />
        <RecurringIncomeTable income={income ?? []} accounts={accounts ?? []} />
      </div>
    </div>
  );
}
