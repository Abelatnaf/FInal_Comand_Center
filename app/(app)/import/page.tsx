import { createClient } from "@/lib/supabase/server";
import { ImportForm } from "@/components/import/ImportForm";

export const metadata = { title: "Import from your bank" };

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("is_archived", false)
    .order("name");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Import from your bank</h1>
        <p className="text-[14px] text-muted mt-0.5">
          Bring in months of history at once instead of typing it
        </p>
      </div>
      <ImportForm accounts={accounts ?? []} />
    </div>
  );
}
