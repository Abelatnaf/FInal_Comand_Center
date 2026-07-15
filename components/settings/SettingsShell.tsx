"use client";

import { useState } from "react";
import { Glass } from "@/components/glass/Glass";
import { SettingsForm, type SettingsData } from "@/components/tables/SettingsForm";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { CategoryBudgetsForm } from "@/components/settings/CategoryBudgetsForm";
import { AccountsForm } from "@/components/settings/AccountsForm";
import { CurrenciesForm, type Currency } from "@/components/settings/CurrenciesForm";
import { ExportDataButton } from "@/components/settings/ExportDataButton";

type Section = "appearance" | "financial" | "account";

const SECTIONS: { id: Section; label: string; caption: string; Icon: (p: { size?: number }) => React.ReactElement }[] = [
  { id: "appearance", label: "Appearance", caption: "Liquid glass & motion", Icon: PaintIcon },
  { id: "financial", label: "Financial", caption: "Currencies, dates, accounts, budgets", Icon: DollarIcon },
  { id: "account", label: "Account", caption: "Export, sign out", Icon: PersonIcon },
];

type Category = { id: number; name: string; monthly_budget: number };
type Account = { id: string; name: string; starting_balance: number; kind: string; interest_rate_pct: number | null };

export function SettingsShell({
  settings,
  categories,
  accounts,
  currencies,
  email,
  onSignOut,
}: {
  settings: SettingsData;
  categories: Category[];
  accounts: Account[];
  currencies: Currency[];
  email: string | null;
  onSignOut: () => void;
}) {
  const [active, setActive] = useState<Section>("appearance");

  return (
    <div className="flex flex-col md:flex-row gap-5">
      {/* Sub-nav sidebar */}
      <aside className="md:w-[230px] md:shrink-0">
        <Glass className="p-1.5 md:sticky md:top-20">
          <nav className="flex md:flex-col gap-0.5 overflow-x-auto">
            {SECTIONS.map(({ id, label, caption, Icon }) => {
              const on = active === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActive(id)}
                  className={`flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-left transition-colors whitespace-nowrap ${
                    on ? "bg-[var(--blue)] text-white" : "text-text hover:bg-[var(--fill-quaternary)]"
                  }`}
                >
                  <span
                    className="app-icon !w-8 !h-8 !rounded-[8px]"
                    style={{ background: on ? "rgba(255,255,255,0.2)" : "var(--fill-tertiary)", color: on ? "#fff" : "var(--label-secondary)" }}
                  >
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-medium leading-tight">{label}</span>
                    <span className={`block text-[12px] leading-tight ${on ? "text-white/70" : "text-text-dim"}`}>{caption}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </Glass>
      </aside>

      {/* Section content */}
      <div className="flex-1 min-w-0">
        {active === "appearance" && <AppearanceSettings />}

        {active === "financial" && (
          <div className="flex flex-col gap-4">
            <SettingsForm settings={settings} />
            <CurrenciesForm currencies={currencies} />
            <AccountsForm accounts={accounts} />
            <CategoryBudgetsForm categories={categories} />
          </div>
        )}

        {active === "account" && (
          <div className="flex flex-col gap-4">
            <Glass className="p-6 max-w-xl">
              <div className="ios-headline mb-1">Account</div>
              <p className="text-text-dim ios-subhead mb-5">
                {email ? `Signed in as ${email}.` : "You are signed in."}
              </p>
              <form action={onSignOut}>
                <button type="submit" className="btn !text-[var(--red)] !bg-[rgba(255,59,48,0.1)] hover:!bg-[rgba(255,59,48,0.16)]">
                  Sign out
                </button>
              </form>
            </Glass>

            <Glass className="p-6 max-w-xl">
              <div className="ios-headline mb-1">Export Your Data</div>
              <p className="text-text-dim ios-subhead mb-4">
                Download everything you&apos;ve logged — transactions, income, accounts, budgets, goals, and more — as one JSON file.
              </p>
              <ExportDataButton />
            </Glass>
          </div>
        )}
      </div>
    </div>
  );
}

function PaintIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="1.5" />
      <circle cx="17.5" cy="10.5" r="1.5" />
      <circle cx="8.5" cy="7.5" r="1.5" />
      <circle cx="6.5" cy="12.5" r="1.5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.4-4.5-8-10-8z" />
    </svg>
  );
}

function DollarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5.5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function PersonIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
