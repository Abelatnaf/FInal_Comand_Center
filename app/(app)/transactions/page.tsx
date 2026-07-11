import { PageHeader } from "@/components/glass/Glass";
import { TransactionsTable } from "@/components/tables/TransactionsTable";
import { createClient } from "@/lib/supabase/server";

export default async function TransactionsPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: categories }] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, date, cadet_week, category_id, description, necessity, is_recurring, currency, amount_original, amount_usd, payment_method, notes, categories(name)"
      )
      .order("date", { ascending: false }),
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="VMI FINANCE"
        title="Transactions"
        subtitle="Full table — filter, inline edit, CSV export."
      />
      <TransactionsTable transactions={transactions ?? []} categories={categories ?? []} />
    </div>
  );
}
