import { PageHeader } from "@/components/glass/Glass";
import { GoalsList } from "@/components/tables/GoalsList";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRate } from "@/lib/fx";

export default async function GoalsPage() {
  const supabase = await createClient();

  const [{ data: rows }, { data: accounts }, { data: balances }, { data: settings }] = await Promise.all([
    supabase.from("savings_goals").select("id, name, target_amount, target_date, account_id, saved_so_far, accounts(name)").order("created_at"),
    supabase.from("accounts").select("id, name").eq("kind", "asset").order("sort_order"),
    supabase.from("account_balance").select("account_id, balance"),
    supabase.from("settings").select("currency_code, secondary_currency_code").single(),
  ]);

  const currency = settings?.currency_code ?? "USD";
  const secondaryCurrency = settings?.secondary_currency_code || null;
  const fxRate = secondaryCurrency ? await getExchangeRate(currency, secondaryCurrency) : null;

  const balanceByAccount = new Map((balances ?? []).map((b) => [b.account_id, b.balance ?? 0]));

  const goals = (rows ?? []).map((g) => {
    const acc = Array.isArray(g.accounts) ? g.accounts[0] : g.accounts;
    return {
      id: g.id,
      name: g.name,
      target_amount: g.target_amount,
      target_date: g.target_date,
      account_id: g.account_id,
      account_name: acc?.name ?? null,
      saved: g.account_id ? balanceByAccount.get(g.account_id) ?? 0 : g.saved_so_far,
    };
  });

  return (
    <div>
      <PageHeader title="Goals" subtitle="Money you're saving up for, and how close you are." />
      <GoalsList goals={goals} accounts={accounts ?? []} currency={currency} secondaryCurrency={secondaryCurrency} fxRate={fxRate} />
    </div>
  );
}
