import { createClient } from "@/lib/supabase/server";
import { RecurringManager, type RecurringItem } from "@/components/recurring/RecurringManager";
import { formatMoney } from "@/lib/money";
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

  const [itemsRes, accountsRes, categoriesRes] = await Promise.all([
    supabase
      .from("recurring_expenses")
      .select("*, accounts(name), categories(name, icon, color)")
      .order("next_due_on"),
    supabase.from("accounts").select("id, name").eq("is_archived", false).order("name"),
    supabase
      .from("categories")
      .select("id, name, kind, color, icon, monthly_budget_usd_minor, sort_order, is_archived")
      .order("sort_order"),
  ]);

  const items: RecurringItem[] = (itemsRes.data ?? []).map((r) => {
    const account = r.accounts as { name: string } | null;
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
      category_id: r.category_id,
      category_name: category?.name ?? null,
      category_icon: category?.icon ?? null,
      category_color: category?.color ?? null,
    };
  });

  let burn = 0n;
  for (const item of items) {
    if (!item.is_active) continue;
    const share = PER_MONTH_X1000[item.cadence] ?? 1000n;
    burn += (BigInt(item.amount_minor) * share) / 1000n;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="page-title">Recurring</h1>
        <p className="text-[14px] text-muted mt-0.5">Subscriptions and standing bills</p>
      </div>

      {burn > 0n && (
        <div className="card card-hero row">
          <p className="section-label mb-2">Costing you every month</p>
          <p className="hero-figure num">{formatMoney(burn)}</p>
          <p className="text-[13px] text-muted mt-2">
            Weekly and yearly items are averaged across the month.
          </p>
        </div>
      )}

      <RecurringManager
        items={items}
        accounts={accountsRes.data ?? []}
        categories={(categoriesRes.data ?? []) as Category[]}
      />
    </div>
  );
}
