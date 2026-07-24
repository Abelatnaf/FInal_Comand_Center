import { PageHeader } from "@/components/glass/Glass";
import { EntriesTable } from "@/components/tables/EntriesTable";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRate } from "@/lib/fx";

export default async function TransactionsPage() {
  const supabase = await createClient();

  const [{ data: rows }, { data: categories }, { data: accounts }, { data: settings }] = await Promise.all([
    supabase
      .from("entries")
      .select(
        "id, date, type, amount, description, notes, is_recurring, account_id, to_account_id, category_id, categories(name), from_account:accounts!entries_account_id_fkey(name), to_account:accounts!entries_to_account_id_fkey(name)"
      )
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("accounts").select("id, name").order("sort_order"),
    supabase.from("settings").select("currency_code, secondary_currency_code").single(),
  ]);

  const currency = settings?.currency_code ?? "USD";
  const secondaryCurrency = settings?.secondary_currency_code || null;
  const fxRate = secondaryCurrency ? await getExchangeRate(currency, secondaryCurrency) : null;

  const entries = (rows ?? []).map((r) => {
    const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories;
    const from = Array.isArray(r.from_account) ? r.from_account[0] : r.from_account;
    const to = Array.isArray(r.to_account) ? r.to_account[0] : r.to_account;
    return {
      id: r.id,
      date: r.date,
      type: r.type,
      amount: r.amount,
      description: r.description,
      notes: r.notes,
      is_recurring: r.is_recurring,
      account_id: r.account_id,
      to_account_id: r.to_account_id,
      category_id: r.category_id,
      category_name: cat?.name ?? null,
      account_name: from?.name ?? null,
      to_account_name: to?.name ?? null,
    };
  });

  return (
    <div>
      <PageHeader title="Transactions" subtitle="Everything you've spent, earned, or moved between accounts." />
      <EntriesTable
        entries={entries}
        categories={categories ?? []}
        accounts={accounts ?? []}
        currency={currency}
        secondaryCurrency={secondaryCurrency}
        fxRate={fxRate}
      />
    </div>
  );
}
