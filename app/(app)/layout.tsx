import { AppShell } from "@/components/nav/AppShell";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRate } from "@/lib/fx";
import { signOut } from "./actions";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const [{ data: categories }, { data: userData }, { data: accounts }, { data: settings }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.auth.getUser(),
    supabase.from("accounts").select("id, name").order("sort_order"),
    supabase.from("settings").select("currency_code, secondary_currency_code").single(),
  ]);

  const mainCurrency = settings?.currency_code ?? "USD";
  const secondaryCurrency = settings?.secondary_currency_code || null;
  const fxRate = secondaryCurrency ? await getExchangeRate(mainCurrency, secondaryCurrency) : null;

  return (
    <AppShell
      onSignOut={signOut}
      categories={categories ?? []}
      email={userData?.user?.email ?? null}
      accounts={accounts ?? []}
      mainCurrency={mainCurrency}
      secondaryCurrency={secondaryCurrency}
      fxRate={fxRate}
    >
      {children}
    </AppShell>
  );
}
