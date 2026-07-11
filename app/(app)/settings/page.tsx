import { PageHeader } from "@/components/glass/Glass";
import { SettingsForm } from "@/components/tables/SettingsForm";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("settings")
    .select("fx_rate, matriculation_date, starting_sofi, starting_ally, starting_cash")
    .eq("id", 1)
    .single();

  return (
    <div>
      <PageHeader eyebrow="VMI FINANCE" title="Settings" subtitle="FX rate, matriculation date, starting balances." />
      <SettingsForm
        settings={
          settings ?? {
            fx_rate: 180,
            matriculation_date: "2026-08-15",
            starting_sofi: 0,
            starting_ally: 0,
            starting_cash: 0,
          }
        }
      />
    </div>
  );
}
