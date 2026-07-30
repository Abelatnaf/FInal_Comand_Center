import { createClient } from "@/lib/supabase/server";
import { ObligationForm } from "@/components/bills/ObligationForm";

export default async function NewBillPage() {
  const supabase = await createClient();
  const { data: payers } = await supabase.from("payers").select("id, label").order("is_default", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Add a bill</h1>
      <ObligationForm payers={payers ?? []} mode="new" />
    </div>
  );
}
