import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Amount } from "@/components/money/Amount";
import { SpendTrend, type TrendPoint } from "@/components/charts/SpendTrend";
import { TransactionRow, type TransactionRowData } from "@/components/ledger/TransactionRow";
import { formatMoney } from "@/lib/money";
import type { Category } from "@/lib/categories";
import { recentMonthStarts } from "@/lib/date";

/** How many months of history the trend covers. */
const TREND_MONTHS = 6;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Category" };
}

/**
 * One category, end to end.
 *
 * Categories were on transaction rows, in the spending bars and in budgets,
 * and none of them went anywhere -- the biggest navigation dead-end in the
 * app. Everything here reads from views that already existed; the only thing
 * that needed a query of its own is the transaction list.
 */
export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const months = recentMonthStarts(TREND_MONTHS);

  const [categoryRes, budgetRes, byMonthRes, accountsRes, categoriesRes, txRes] = await Promise.all([
    supabase.from("categories").select("*").eq("id", id).maybeSingle(),
    supabase.from("budget_status").select("*").eq("category_id", id).maybeSingle(),
    supabase
      .from("category_spend_by_month")
      .select("month, spent_usd_minor")
      .eq("category_id", id)
      .gte("month", months[0])
      .order("month"),
    supabase.from("accounts").select("id, name").eq("is_archived", false).order("name"),
    supabase
      .from("categories")
      .select("id, name, kind, color, icon, budget_usd_minor, sort_order, is_archived")
      .order("sort_order"),
    supabase
      .from("transactions_with_week")
      .select(
        "id, occurred_on, direction, amount_minor, category_id, category_name, category_icon, category_color, note, tags, account_id, obligation_id, receipt_path, accounts(name)"
      )
      .eq("category_id", id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const category = categoryRes.data;
  if (!category) notFound();

  const budget = budgetRes.data;
  const spent = BigInt(budget?.spent_usd_minor ?? 0);
  const limit = budget?.budget_usd_minor != null ? BigInt(budget.budget_usd_minor) : null;
  const percent = limit && limit > 0n ? Number((spent * 100n) / limit) : null;
  const remaining = limit != null ? limit - spent : null;

  // Months with no spending are absent from the view, not zero rows -- a gap
  // in the series would misread as "we have no data" rather than "you spent
  // nothing", so the missing months are filled in explicitly.
  const spendByMonth = new Map(
    (byMonthRes.data ?? []).map((r) => [r.month ?? "", BigInt(r.spent_usd_minor ?? 0)])
  );
  const trend: TrendPoint[] = months.map((m) => ({ month: m, minor: spendByMonth.get(m) ?? 0n }));

  const withActivity = trend.filter((t) => t.minor > 0n);
  const average =
    withActivity.length > 0
      ? withActivity.reduce((s, t) => s + t.minor, 0n) / BigInt(withActivity.length)
      : 0n;

  const transactions: TransactionRowData[] = (txRes.data ?? []).map((t) => ({
    id: t.id ?? "",
    occurred_on: t.occurred_on ?? "",
    direction: t.direction as "in" | "out",
    amount_minor: t.amount_minor ?? 0,
    category_id: t.category_id,
    category_name: t.category_name,
    category_icon: t.category_icon,
    category_color: t.category_color,
    note: t.note,
    tags: t.tags,
    account_id: t.account_id ?? "",
    account_name: (t.accounts as { name: string } | null)?.name ?? "—",
    obligation_id: t.obligation_id,
    receipt_path: t.receipt_path,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/budgets" className="text-[13px] text-muted">
          ← Budgets
        </Link>
        <h1 className="page-title mt-1">
          <span aria-hidden className="mr-2">
            {category.icon}
          </span>
          {category.name}
        </h1>
      </div>

      <div className="card card-hero row">
        <p className="section-label mb-2">
          Spent {budget?.window_name ? `· ${budget.window_name}` : "this period"}
        </p>
        <Amount minor={spent} className="hero-figure block" />

        {limit != null ? (
          <>
            <div className="progress-track mt-4">
              <div
                className="progress-fill"
                data-tone={
                  percent !== null && percent > 100
                    ? "alarm"
                    : percent !== null && percent > 85
                      ? "urgent"
                      : undefined
                }
                style={{ width: `${Math.min(percent ?? 0, 100)}%` }}
              />
            </div>
            <p className="text-[14px] text-muted mt-2">
              of {formatMoney(limit)}
              {remaining != null &&
                (remaining >= 0n
                  ? ` · ${formatMoney(remaining)} left`
                  : ` · ${formatMoney(-remaining)} over`)}
            </p>
          </>
        ) : (
          <p className="text-[14px] text-muted mt-2">
            No budget set.{" "}
            <Link href="/budgets" className="text-accent font-semibold">
              Set one
            </Link>{" "}
            and this becomes a ceiling you can watch.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start">
        <div className="card row">
          <div className="flex items-baseline justify-between mb-3">
            <p className="section-label">Last {TREND_MONTHS} months</p>
            {average > 0n && (
              <p className="text-[13px] text-muted">
                {/* Averaged over months with real activity, not over six --
                    dividing by six on two months of history understates badly. */}
                <Amount minor={average} /> a month
              </p>
            )}
          </div>
          <SpendTrend points={trend} />
        </div>

        <div className="card">
          <div className="row pb-0 flex items-center justify-between">
            <p className="section-label">Transactions</p>
            <Link
              href={`/ledger?category_id=${category.id}`}
              className="text-[13px] text-accent font-semibold"
            >
              In the ledger →
            </Link>
          </div>
          {transactions.length === 0 && (
            <p className="row text-[14px] text-muted">Nothing filed under {category.name} yet.</p>
          )}
          {transactions.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              accounts={accountsRes.data ?? []}
              categories={(categoriesRes.data ?? []) as Category[]}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
