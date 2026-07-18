import { PageHeader } from "@/components/glass/Glass";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../actions";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: settings }, { data: categories }, { data: accounts }, { data: currencies }, { data: userData }, { data: mfaData }, { data: backups }] =
    await Promise.all([
      supabase
        .from("settings")
        .select("tracking_start_date, low_balance_threshold, notify_weekly_digest, notify_budget_alerts, notify_bill_reminders")
        .single(),
      supabase.from("categories").select("id, name, monthly_budget").order("sort_order"),
      supabase.from("accounts").select("id, name, starting_balance, kind, interest_rate_pct").order("sort_order"),
      supabase.from("currencies").select("id, code, name, rate_to_usd").order("code"),
      supabase.auth.getUser(),
      supabase.auth.mfa.listFactors(),
      supabase.from("data_backups").select("id, created_at, source").order("created_at", { ascending: false }),
    ]);

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your look, your accounts, your money — all in your control." />
      <SettingsShell
        email={userData?.user?.email ?? null}
        onSignOut={signOut}
        categories={categories ?? []}
        accounts={accounts ?? []}
        currencies={currencies ?? []}
        mfaFactors={mfaData?.totp ?? []}
        settings={
          settings ?? {
            tracking_start_date: new Date().toISOString().slice(0, 10),
            low_balance_threshold: null,
          }
        }
        notificationPrefs={{
          notify_weekly_digest: settings?.notify_weekly_digest ?? false,
          notify_budget_alerts: settings?.notify_budget_alerts ?? false,
          notify_bill_reminders: settings?.notify_bill_reminders ?? false,
        }}
        backups={backups ?? []}
      />
    </div>
  );
}
