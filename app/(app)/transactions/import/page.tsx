import { PageHeader } from "@/components/glass/Glass";
import { ImportForm } from "@/components/ImportForm";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: accounts }, { data: settings }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("accounts").select("id, name").order("sort_order"),
    supabase.from("settings").select("currency_code").single(),
  ]);

  return (
    <div>
      <PageHeader title="Import from Bank" subtitle="Upload a CSV export from your bank instead of entering everything by hand." />
      <ImportForm categories={categories ?? []} accounts={accounts ?? []} currency={settings?.currency_code ?? "USD"} />
    </div>
  );
}
