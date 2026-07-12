import { PageHeader } from "@/components/glass/Glass";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: userData }] = await Promise.all([
    supabase
      .from("settings")
      .select("fx_rate, matriculation_date, starting_sofi, starting_ally, starting_cash")
      .eq("id", 1)
      .single(),
    supabase.auth.getUser(),
  ]);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Appearance, FX rate, matriculation date, and balances." />
      <SettingsShell
        email={userData?.user?.email ?? null}
        onSignOut={signOut}
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
