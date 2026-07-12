import { PageHeader } from "@/components/glass/Glass";
import { ImportForm } from "@/components/ImportForm";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: currencies }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("currencies").select("code, name, rate_to_usd").order("code"),
  ]);

  return (
    <div>
      <PageHeader title="Import" subtitle="Bring in transactions from a bank statement CSV." />
      <ImportForm categories={categories ?? []} currencies={currencies ?? []} />
    </div>
  );
}
