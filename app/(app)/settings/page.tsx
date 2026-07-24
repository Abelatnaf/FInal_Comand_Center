import { Glass, PageHeader } from "@/components/glass/Glass";
import { AccountsForm } from "@/components/settings/AccountsForm";
import { CategoriesForm } from "@/components/settings/CategoriesForm";
import { ExportDataButton } from "@/components/settings/ExportDataButton";
import { updateCurrencyCode, updateLowBalanceThreshold } from "./actions";
import { signOut } from "../actions";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRate } from "@/lib/fx";

export default async function SettingsPage() {
  const supabase = await createClient();

  const [{ data: userData }, { data: accounts }, { data: categories }, { data: settings }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("accounts").select("id, name, kind, starting_balance").order("sort_order"),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("settings").select("currency_code, secondary_currency_code, low_balance_threshold").single(),
  ]);

  const currency = settings?.currency_code ?? "USD";
  const secondaryCurrency = settings?.secondary_currency_code ?? "";
  const fxRate = secondaryCurrency ? await getExchangeRate(currency, secondaryCurrency) : null;
  const lowBalanceThreshold = settings?.low_balance_threshold ?? "";

  return (
    <div>
      <PageHeader title="Settings" subtitle="Your accounts, categories, and options." />

      <Glass className="p-5 mb-4">
        <div className="section-header mb-2">Accounts</div>
        <AccountsForm accounts={accounts ?? []} currency={currency} secondaryCurrency={secondaryCurrency || null} fxRate={fxRate} />
      </Glass>

      <Glass className="p-5 mb-4">
        <div className="section-header mb-2">Categories</div>
        <CategoriesForm categories={categories ?? []} />
      </Glass>

      <Glass className="p-5 mb-4">
        <div className="section-header mb-2">Currency</div>
        <form action={updateCurrencyCode} className="flex flex-col gap-3">
          <div>
            <label className="stat-label block mb-1.5">Main currency</label>
            <input
              name="currencyCode"
              defaultValue={currency}
              maxLength={3}
              className="input text-sm !py-2 !px-3 w-24 uppercase"
              placeholder="USD"
            />
          </div>
          <div>
            <label className="stat-label block mb-1.5">Show a second currency alongside it (optional)</label>
            <input
              name="secondaryCurrencyCode"
              defaultValue={secondaryCurrency}
              maxLength={3}
              className="input text-sm !py-2 !px-3 w-24 uppercase"
              placeholder="ETB"
            />
          </div>
          <button type="submit" className="btn text-[13px] !py-1.5 !px-3 w-fit">
            Save
          </button>
        </form>
        <p className="ios-footnote text-text-faint mt-2">
          3-letter currency codes, e.g. USD, ETB, EUR. When a second currency is set, every dollar figure across the
          app — Home, Transactions, Budgets, Goals, and your account balances here — shows a live-converted line
          underneath it. Rates update roughly once a day.
        </p>
      </Glass>

      <Glass className="p-5 mb-4">
        <div className="section-header mb-2">Alerts</div>
        <form action={updateLowBalanceThreshold} className="flex flex-col gap-3">
          <div>
            <label className="stat-label block mb-1.5">Notify me when an account drops below (optional)</label>
            <input
              name="lowBalanceThreshold"
              type="number"
              step="0.01"
              min="0"
              defaultValue={lowBalanceThreshold}
              className="input text-sm !py-2 !px-3 w-32"
              placeholder="e.g. 100"
            />
          </div>
          <button type="submit" className="btn text-[13px] !py-1.5 !px-3 w-fit">
            Save
          </button>
        </form>
        <p className="ios-footnote text-text-faint mt-2">
          Leave blank to turn this off. Home also shows a quiet nudge when a category goes over its monthly budget.
        </p>
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
