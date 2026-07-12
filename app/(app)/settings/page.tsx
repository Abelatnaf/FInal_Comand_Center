import { PageHeader } from "@/components/glass/Glass";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: categories }, { data: accounts }, { data: userData }] = await Promise.all([
    supabase.from("settings").select("fx_rate, tracking_start_date").single(),
    supabase.from("categories").select("id, name, monthly_budget").order("sort_order"),
    supabase.from("accounts").select("id, name, starting_balance, kind").order("sort_order"),
    supabase.auth.getUser(),
  ]);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Appearance, FX rate, accounts, and budgets." />
      <SettingsShell
        email={userData?.user?.email ?? null}
        onSignOut={signOut}
        categories={categories ?? []}
        accounts={accounts ?? []}
        settings={
          settings ?? {
            fx_rate: 1,
            tracking_start_date: new Date().toISOString().slice(0, 10),
          }
        }
      />
    </div>
  );
}
