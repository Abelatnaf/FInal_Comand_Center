import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(app)/actions";
import { AccountsForm } from "@/components/settings/AccountsForm";
import { CategoriesForm } from "@/components/settings/CategoriesForm";
import { CategoryRulesForm, type CategoryRule } from "@/components/settings/CategoryRulesForm";
import { TransfersForm, type TransferRow } from "@/components/settings/TransfersForm";
import { ExportButton } from "@/components/settings/ExportButton";
import { RestoreForm } from "@/components/settings/RestoreForm";
import { TrackingWeekForm } from "@/components/settings/TrackingWeekForm";
import { ShareLinksForm } from "@/components/settings/ShareLinksForm";
import { AccountDangerZone } from "@/components/settings/AccountDangerZone";
import type { Category } from "@/lib/categories";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [accountsRes, categoriesRes, rulesRes, settingsRes, shareLinksRes, transfersRes] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, kind, institution, opening_balance_minor, is_archived")
        .order("kind")
        .order("name"),
      supabase
        .from("categories")
        .select("id, name, kind, color, icon, budget_usd_minor, sort_order, is_archived")
        .order("sort_order"),
      supabase.from("category_rules").select("id, match_text, category_id").order("priority"),
      supabase.from("settings").select("tracking_start_date").maybeSingle(),
      supabase
        .from("share_links")
        .select("id, label, created_at, revoked_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("transfers")
        .select("id, occurred_on, amount_minor, note, from_account_id, to_account_id")
        .order("occurred_on", { ascending: false })
        .limit(25),
    ]);

  const categories = (categoriesRes.data ?? []) as Category[];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="page-title">Settings</h1>

      <AccountsForm accounts={accountsRes.data ?? []} />

      <TransfersForm
        accounts={(accountsRes.data ?? []).filter((a) => !a.is_archived)}
        transfers={(transfersRes.data ?? []) as TransferRow[]}
      />

      <CategoriesForm categories={categories} />

      <CategoryRulesForm rules={(rulesRes.data ?? []) as CategoryRule[]} categories={categories} />

      <TrackingWeekForm trackingStartDate={settingsRes.data?.tracking_start_date ?? null} />

      <ShareLinksForm links={shareLinksRes.data ?? []} />

      <div className="card row">
        <ExportButton />
      </div>

      <RestoreForm />

      <AccountDangerZone email={user?.email} />

      <div className="card row">
        <form action={signOut}>
          <button type="submit" className="btn w-full">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
