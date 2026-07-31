import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(app)/actions";
import { FxRateForm } from "@/components/settings/FxRateForm";
import { FxRateHistory } from "@/components/settings/FxRateHistory";
import { AccountsForm } from "@/components/settings/AccountsForm";
import { TransfersForm, type TransferRow } from "@/components/settings/TransfersForm";
import { PayersForm } from "@/components/settings/PayersForm";
import { ExportButton } from "@/components/settings/ExportButton";
import { RestoreForm } from "@/components/settings/RestoreForm";
import { TrackingWeekForm } from "@/components/settings/TrackingWeekForm";
import { ShareLinksForm } from "@/components/settings/ShareLinksForm";
import type { Currency } from "@/lib/money";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [fxRes, accountsRes, payersRes, settingsRes, shareLinksRes, transfersRes] = await Promise.all([
    supabase
      .from("fx_rates")
      .select("id, etb_per_usd, effective_on, source")
      .order("effective_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("accounts").select("id, name, currency, kind, opening_balance_minor, is_archived").order("kind").order("name"),
    supabase.from("payers").select("id, key, label, class_year").order("is_default", { ascending: false }),
    supabase.from("settings").select("tracking_start_date").maybeSingle(),
    supabase.from("share_links").select("id, label, created_at, revoked_at").order("created_at", { ascending: false }),
    supabase.from("transfers").select("id, occurred_on, from_amount_minor, to_amount_minor, note, from_account_id, to_account_id").order("occurred_on", { ascending: false }).limit(25),
  ]);

  const fxRates = fxRes.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Settings</h1>

      <FxRateForm current={fxRates[0] ?? null} />

      <FxRateHistory rates={fxRates} />

      <AccountsForm accounts={(accountsRes.data ?? []) as { id: string; name: string; currency: Currency; kind: "bank" | "cash" | "processor"; opening_balance_minor: number; is_archived: boolean }[]} />

      <TransfersForm
        accounts={(accountsRes.data ?? []).filter((a) => !a.is_archived) as { id: string; name: string; currency: Currency }[]}
        transfers={(transfersRes.data ?? []) as TransferRow[]}
      />

      <PayersForm payers={payersRes.data ?? []} />

      <TrackingWeekForm trackingStartDate={settingsRes.data?.tracking_start_date ?? null} />

      <ShareLinksForm links={shareLinksRes.data ?? []} />

      <div className="card row">
        <ExportButton />
      </div>

      <RestoreForm />

      <div className="card row flex flex-col gap-2">
        <p className="text-[14px] text-muted">{user?.email}</p>
        <form action={signOut}>
          <button type="submit" className="btn btn-destructive w-full">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
