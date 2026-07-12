import { PageHeader } from "@/components/glass/Glass";
import { TransactionsTable } from "@/components/tables/TransactionsTable";
import { createClient } from "@/lib/supabase/server";

export default async function TransactionsPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: categories }, { data: currencies }] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, date, week_number, category_id, description, necessity, is_recurring, currency, amount_original, amount_usd, payment_method, notes, receipt_path, categories(name), transaction_splits(id, category_id, amount_usd, categories(name))"
      )
      .order("date", { ascending: false }),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("currencies").select("code, name, rate_to_usd").order("code"),
  ]);

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle="Full table — filter, inline edit, CSV export."
      />
      <TransactionsTable transactions={transactions ?? []} categories={categories ?? []} currencies={currencies ?? []} />
    </div>
  );
}
