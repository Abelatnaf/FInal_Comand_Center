import { createClient } from "@/lib/supabase/server";
import { TermsManager, type TermRow } from "@/components/terms/TermsManager";

export const metadata = { title: "Terms" };

export default async function TermsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("terms")
    .select("id, name, starts_on, ends_on, is_archived, target_end_balance_minor")
    .order("starts_on", { ascending: false });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Terms</h1>
        <p className="text-[14px] text-muted mt-0.5">Semesters your money has to last through</p>
      </div>
      <TermsManager terms={(data ?? []) as TermRow[]} />
    </div>
  );
}
