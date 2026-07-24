import { Glass, PageHeader } from "@/components/glass/Glass";
import { CategoryBudgetRow, RecurringRow } from "@/components/tables/BudgetsList";
import { createClient } from "@/lib/supabase/server";
import { getExchangeRate } from "@/lib/fx";

function monthStartIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function BudgetsPage() {
  const supabase = await createClient();

  const [{ data: budgetRows }, { data: recurringEntries }, { data: settings }] = await Promise.all([
    supabase.from("budget_vs_actual_this_month").select("*").order("name"),
    supabase
      .from("entries")
      .select("id, type, description, amount, date, categories(name)")
      .eq("is_recurring", true)
      .order("date", { ascending: false }),
    supabase.from("settings").select("currency_code, secondary_currency_code").single(),
  ]);

  const currency = settings?.currency_code ?? "USD";
  const secondaryCurrency = settings?.secondary_currency_code || null;
  const fxRate = secondaryCurrency ? await getExchangeRate(currency, secondaryCurrency) : null;
  const monthStart = monthStartIso();

  const seen = new Set<string>();
  const recurringItems = (recurringEntries ?? [])
    .filter((e) => {
      const key = `${e.type}:${e.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((e) => {
      const cat = Array.isArray(e.categories) ? e.categories[0] : e.categories;
      const loggedThisMonth = (recurringEntries ?? []).some(
        (x) => x.type === e.type && x.description === e.description && x.date >= monthStart
      );
      return {
        id: e.id,
        type: e.type,
        description: e.description,
        amount: e.amount,
        category_name: cat?.name ?? null,
        loggedThisMonth,
      };
    });

  return (
    <div>
      <PageHeader title="Budgets" subtitle="What you've budgeted per category, and what repeats every month." />

      <Glass className="p-5 mb-4">
        <div className="section-header mb-1">This Month, by Category</div>
        <div className="flex flex-col">
          {(budgetRows ?? []).map((row) => (
            <CategoryBudgetRow
              key={row.category_id}
              row={{
                category_id: row.category_id!,
                name: row.name!,
                monthly_budget: row.monthly_budget ?? 0,
                actual_spent: row.actual_spent ?? 0,
              }}
              currency={currency}
              secondaryCurrency={secondaryCurrency}
              fxRate={fxRate}
            />
          ))}
        </div>
      </Glass>

      <Glass className="p-5">
        <div className="section-header mb-1">Recurring</div>
        {recurringItems.length === 0 ? (
          <p className="ios-subhead text-text-dim py-4 text-center">
            Nothing marked as recurring yet. Toggle &ldquo;Repeats every month&rdquo; when adding an entry.
          </p>
        ) : (
          <div className="flex flex-col">
            {recurringItems.map((item) => (
              <RecurringRow key={item.id} item={item} currency={currency} secondaryCurrency={secondaryCurrency} fxRate={fxRate} />
            ))}
          </div>
        )}
      </Glass>
    </div>
  );
}
