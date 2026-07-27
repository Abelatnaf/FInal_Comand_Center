import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(app)/actions";
import { FxRateForm } from "@/components/settings/FxRateForm";
import { AccountsForm } from "@/components/settings/AccountsForm";
import { PayersForm } from "@/components/settings/PayersForm";
import { ExportButton } from "@/components/settings/ExportButton";
import type { Currency } from "@/lib/money";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [fxRes, accountsRes, payersRes] = await Promise.all([
    supabase
      .from("fx_rates")
      .select("etb_per_usd, effective_on, source")
      .order("effective_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("accounts").select("id, name, currency, kind, opening_balance_minor, is_archived").order("kind").order("name"),
    supabase.from("payers").select("id, key, label, class_year").order("is_default", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[20px] font-semibold text-text">Settings</h1>

      <FxRateForm current={fxRes.data ?? null} />

      <AccountsForm accounts={(accountsRes.data ?? []) as { id: string; name: string; currency: Currency; kind: "bank" | "cash" | "processor"; opening_balance_minor: number; is_archived: boolean }[]} />

      <PayersForm payers={payersRes.data ?? []} />

      <div className="card row">
        <ExportButton />
      </div>

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
