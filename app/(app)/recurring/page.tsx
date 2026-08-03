import { createClient } from "@/lib/supabase/server";
import { RecurringManager, type RecurringItem } from "@/components/recurring/RecurringManager";
import { formatMoney, type Currency } from "@/lib/money";
import type { Category } from "@/lib/categories";

/**
 * A cadence's share of one month, scaled by 1000 so the whole calculation
 * stays in integers — no float ever touches a money figure.
 */
const PER_MONTH_X1000: Record<string, bigint> = {
  weekly: 4333n, // 52 weeks / 12 months
  monthly: 1000n,
  quarterly: 333n,
  yearly: 83n,
};

export default async function RecurringPage() {
  const supabase = await createClient();

  const [itemsRes, accountsRes, payersRes, categoriesRes] = await Promise.all([
    supabase
      .from("recurring_expenses")
      .select("*, accounts(name, currency), categories(name, icon, color)")
      .order("next_due_on"),
    supabase.from("accounts").select("id, name, currency").eq("is_archived", false).order("name"),
    supabase.from("payers").select("id, label, is_default").order("is_default", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, kind, color, icon, monthly_budget_usd_minor, sort_order, is_archived")
      .order("sort_order"),
  ]);

  const items: RecurringItem[] = (itemsRes.data ?? []).map((r) => {
    const account = r.accounts as { name: string; currency: string } | null;
    const category = r.categories as { name: string; icon: string; color: string } | null;
    return {
      id: r.id,
      name: r.name,
      amount_minor: r.amount_minor,
      cadence: r.cadence,
      next_due_on: r.next_due_on,
      auto_post: r.auto_post,
      is_active: r.is_active,
      last_posted_on: r.last_posted_on,
      account_id: r.account_id,
      account_name: account?.name ?? "—",
      currency: (account?.currency ?? "USD") as Currency,
      category_id: r.category_id,
      category_name: category?.name ?? null,
      category_icon: category?.icon ?? null,
      category_color: category?.color ?? null,
    };
  });

  // Grouped by currency rather than converted: each amount is charged in its
  // own currency, and converting them into one figure here would be an
  // estimate at today's rate rather than a fact.
  const burn = new Map<Currency, bigint>();
  for (const item of items) {
    if (!item.is_active) continue;
    const share = PER_MONTH_X1000[item.cadence] ?? 1000n;
    const monthly = (BigInt(item.amount_minor) * share) / 1000n;
    burn.set(item.currency, (burn.get(item.currency) ?? 0n) + monthly);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Recurring</h1>
        <p className="text-[14px] text-muted mt-0.5">Subscriptions and standing bills</p>
      </div>

      {burn.size > 0 && (
        <div className="card card-hero row">
          <p className="section-label mb-2">Costing you every month</p>
          {[...burn.entries()].map(([currency, minor], i) => (
            <p key={currency} className={i === 0 ? "hero-figure num" : "text-[20px] font-semibold num mt-1"}>
              {formatMoney(minor, currency)}
            </p>
          ))}
          <p className="text-[13px] text-muted mt-2">
            Weekly and yearly items are averaged across the month.
          </p>
        </div>
      )}

      <RecurringManager
        items={items}
        accounts={(accountsRes.data ?? []) as { id: string; name: string; currency: Currency }[]}
        payers={payersRes.data ?? []}
        categories={(categoriesRes.data ?? []) as Category[]}
      />
    </div>
  );
}
