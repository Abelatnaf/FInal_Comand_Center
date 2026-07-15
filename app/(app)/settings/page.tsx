import { PageHeader } from "@/components/glass/Glass";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: categories }, { data: accounts }, { data: currencies }, { data: userData }] = await Promise.all([
    supabase.from("settings").select("tracking_start_date, low_balance_threshold").single(),
    supabase.from("categories").select("id, name, monthly_budget").order("sort_order"),
    supabase.from("accounts").select("id, name, starting_balance, kind, interest_rate_pct").order("sort_order"),
    supabase.from("currencies").select("id, code, name, rate_to_usd").order("code"),
    supabase.auth.getUser(),
  ]);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Appearance, currencies, accounts, and budgets." />
      <SettingsShell
        email={userData?.user?.email ?? null}
        onSignOut={signOut}
        categories={categories ?? []}
        accounts={accounts ?? []}
        currencies={currencies ?? []}
        settings={
          settings ?? {
            tracking_start_date: new Date().toISOString().slice(0, 10),
            low_balance_threshold: null,
          }
        }
      />
    </div>
  );
}
