import { Glass, PageHeader } from "@/components/glass/Glass";
import { AccountsForm } from "@/components/settings/AccountsForm";
import { CategoriesForm } from "@/components/settings/CategoriesForm";
import { ExportDataButton } from "@/components/settings/ExportDataButton";
import { updateCurrencyCode } from "./actions";
import { signOut } from "../actions";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: userData }, { data: accounts }, { data: categories }, { data: settings }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("accounts").select("id, name, kind, starting_balance").order("sort_order"),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("settings").select("currency_code").single(),
  ]);

  const currency = settings?.currency_code ?? "USD";

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your accounts, categories, and options." />

      <Glass className="p-5 mb-4">
        <div className="section-header mb-2">Accounts</div>
        <AccountsForm accounts={accounts ?? []} currency={currency} />
      </Glass>

      <Glass className="p-5 mb-4">
        <div className="section-header mb-2">Categories</div>
        <CategoriesForm categories={categories ?? []} />
      </Glass>

      <Glass className="p-5 mb-4">
        <div className="section-header mb-2">Currency</div>
        <form action={updateCurrencyCode} className="flex gap-2.5">
          <input
            name="currencyCode"
            defaultValue={currency}
            maxLength={3}
            className="input text-sm !py-2 !px-3 w-24 uppercase"
            placeholder="USD"
          />
          <button type="submit" className="btn text-[13px] !py-1.5 !px-3">
            Save
          </button>
        </form>
        <p className="ios-footnote text-text-faint mt-2">3-letter currency code, e.g. USD, EUR, GBP.</p>
      </Glass>

      <Glass className="p-5">
        <div className="section-header mb-2">Account</div>
        <p className="ios-body mb-3">{userData?.user?.email}</p>
        <div className="flex flex-wrap gap-3 items-center">
          <ExportDataButton />
          <form action={signOut}>
            <button type="submit" className="link-destructive text-[15px]">
              Sign out
            </button>
          </form>
        </div>
      </Glass>
    </div>
  );
}
