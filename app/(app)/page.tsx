import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SettingsIcon } from "@/components/nav/icons";
import { Amount } from "@/components/money/Amount";
import { AccountSwatch } from "@/components/money/AccountSwatch";
import { TransactionRow, type TransactionRowData } from "@/components/ledger/TransactionRow";
import { CategoryBars } from "@/components/charts/CategoryBars";
import { SpendTrend } from "@/components/charts/SpendTrend";
import { formatMoney } from "@/lib/money";
import type { Category } from "@/lib/categories";
import {
  formatShortDate,
  monthStartIso,
  recentMonthStarts,
  formatMonthLong,
  todayIso,
  daysAheadIso,
} from "@/lib/date";

const TREND_MONTHS = 6;
/** How far ahead a bill counts as "coming up" on the home screen. */
const DUE_SOON_DAYS = 14;

export default async function HomePage() {
  const supabase = await createClient();

  const thisMonth = monthStartIso(0);
  const lastMonth = monthStartIso(1);
  const trendFrom = monthStartIso(TREND_MONTHS - 1);

  const [
    accountsAllRes,
    categoriesRes,
    balancesRes,
    positionRes,
    monthlyRes,
    categorySpendRes,
    budgetsRes,
    openObligationsRes,
    recurringRes,
    recentRes,
  ] = await Promise.all([
    supabase.from("accounts").select("id, name").eq("is_archived", false).order("name"),
    supabase
      .from("categories")
      .select("id, name, kind, color, icon, monthly_budget_usd_minor, sort_order, is_archived")
      .order("sort_order"),
    supabase.from("balance_by_account").select("*").eq("is_archived", false).order("kind").order("name"),
    supabase.from("liquid_position").select("*").maybeSingle(),
    supabase.from("monthly_summary").select("*").gte("month", trendFrom).order("month"),
    supabase.from("category_spend_by_month").select("*").eq("month", thisMonth),
    supabase.from("budget_status").select("*").not("monthly_budget_usd_minor", "is", null),
    supabase
      .from("obligation_progress")
      .select("*")
      .in("status", ["open", "partial"])
      .order("due_on", { ascending: true, nullsFirst: false }),
    supabase
      .from("recurring_expenses")
      .select("id, name, amount_minor, next_due_on")
      .eq("is_active", true)
      .order("next_due_on"),
    supabase
      .from("transactions_with_week")
      .select(
        "id, occurred_on, direction, amount_minor, category_id, category_name, category_icon, category_color, note, account_id, obligation_id, receipt_path, accounts(name)"
      )
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const accounts = accountsAllRes.data ?? [];
  const categories = (categoriesRes.data ?? []) as Category[];

  const monthly = monthlyRes.data ?? [];
  const byMonth = new Map(monthly.map((m) => [m.month as string, m]));
  const current = byMonth.get(thisMonth);
  const previous = byMonth.get(lastMonth);

  const spentThisMonth = BigInt(current?.spent_usd_minor ?? 0);
  const incomeThisMonth = BigInt(current?.income_usd_minor ?? 0);
  const netThisMonth = BigInt(current?.net_usd_minor ?? 0);
  const spentLastMonth = BigInt(previous?.spent_usd_minor ?? 0);

  // Only claim a comparison when there is a real prior month to compare to.
  const spendDelta = previous ? spentThisMonth - spentLastMonth : null;
  const deltaPercent =
    spendDelta !== null && spentLastMonth > 0n ? Number((spendDelta * 100n) / spentLastMonth) : null;

  const trend = recentMonthStarts(TREND_MONTHS).map((month) => ({
    month,
    minor: BigInt(byMonth.get(month)?.spent_usd_minor ?? 0),
  }));

  const slices = (categorySpendRes.data ?? []).map((c) => ({
    id: c.category_id ?? "",
    name: c.category_name ?? "Uncategorized",
    icon: c.category_icon,
    color: c.category_color,
    minor: BigInt(c.spent_usd_minor ?? 0),
  }));

  const budgets = budgetsRes.data ?? [];
  const budgetTotal = budgets.reduce((s, b) => s + BigInt(b.monthly_budget_usd_minor ?? 0), 0n);
  const budgetSpent = budgets.reduce((s, b) => s + BigInt(b.spent_usd_minor ?? 0), 0n);
  const overBudget = budgets.filter(
    (b) => BigInt(b.spent_usd_minor ?? 0) > BigInt(b.monthly_budget_usd_minor ?? 0)
  );
  const budgetPercent = budgetTotal > 0n ? Number((budgetSpent * 100n) / budgetTotal) : 0;

  const openObligations = [...(openObligationsRes.data ?? [])].sort((a, b) => {
    if (a.is_past_due !== b.is_past_due) return a.is_past_due ? -1 : 1;
    if (a.due_on == null) return 1;
    if (b.due_on == null) return -1;
    return a.due_on.localeCompare(b.due_on);
  });
  const nextDue = openObligations[0] ?? null;

  // Anything landing inside the window, from either source. A reminder is only
  // useful if it covers subscriptions too, not just manually entered bills.
  const today = todayIso();
  const horizon = daysAheadIso(DUE_SOON_DAYS);
  const dueSoon = [
    ...openObligations
      .filter((o) => o.due_on && o.due_on <= horizon)
      .map((o) => ({
        key: `o-${o.obligation_id}`,
        href: `/bills/${o.obligation_id}`,
        title: o.title ?? "",
        due_on: o.due_on!,
        minor: BigInt(o.amount_remaining_usd_minor ?? 0),
      })),
    ...(recurringRes.data ?? [])
      .filter((r) => r.next_due_on <= horizon)
      .map((r) => ({
        key: `r-${r.id}`,
        href: "/recurring",
        title: r.name,
        due_on: r.next_due_on,
        minor: BigInt(r.amount_minor),
      })),
  ].sort((a, b) => a.due_on.localeCompare(b.due_on));

  const dueSoonTotal = dueSoon.reduce((s, d) => s + d.minor, 0n);

  const recent: TransactionRowData[] = (recentRes.data ?? []).map((t) => ({
    id: t.id ?? "",
    occurred_on: t.occurred_on ?? "",
    direction: t.direction as "in" | "out",
    amount_minor: t.amount_minor ?? 0,
    category_id: t.category_id,
    category_name: t.category_name,
    category_icon: t.category_icon,
    category_color: t.category_color,
    note: t.note,
    account_id: t.account_id ?? "",
    account_name: (t.accounts as { name: string } | null)?.name ?? "—",
    obligation_id: t.obligation_id,
    receipt_path: t.receipt_path,
  }));

  const position = positionRes.data;
  const netWorth = BigInt(position?.net_worth_usd_minor ?? 0);
  const totalDebt = BigInt(position?.total_debt_usd_minor ?? 0);
  const hasAnyActivity = monthly.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{formatMonthLong(thisMonth)}</h1>
        <Link href="/settings" aria-label="Settings" className="p-2 -m-2 text-muted">
          <SettingsIcon className="w-6 h-6" />
        </Link>
      </div>

      {/* Spending is the headline figure: this is an expense tracker first. */}
      <div className="card card-hero row">
        <p className="section-label mb-2">Spent this month</p>
        <Amount minor={spentThisMonth} className="hero-figure block" />
        {spendDelta !== null && (
          <p className="text-[14px] text-muted mt-1">
            {spendDelta === 0n ? (
              "Same as last month"
            ) : (
              <>
                <span className={spendDelta > 0n ? "text-alarm" : "text-positive"}>
                  {spendDelta > 0n ? "↑" : "↓"} {formatMoney(spendDelta < 0n ? -spendDelta : spendDelta)}
                  {deltaPercent !== null && ` (${Math.abs(deltaPercent)}%)`}
                </span>{" "}
                vs last month
              </>
            )}
          </p>
        )}

        <div className="flex gap-6 mt-4 pt-4 border-t">
          <div>
            <p className="section-label">Income</p>
            <Amount minor={incomeThisMonth} className="text-[17px] font-semibold text-positive" />
          </div>
          <div>
            <p className="section-label">Net</p>
            <Amount
              minor={netThisMonth}
              className={`text-[17px] font-semibold ${netThisMonth < 0n ? "text-alarm" : ""}`}
            />
          </div>
        </div>
      </div>

      {!hasAnyActivity && (
        <div className="card row flex flex-col gap-3">
          <p className="text-[15px]">Nothing logged yet. Add your first expense to get started.</p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/add" className="btn btn-primary">
              Add an expense
            </Link>
            <Link href="/import" className="btn">
              Import from your bank
            </Link>
          </div>
        </div>
      )}

      {dueSoon.length > 0 && (
        <div className="card">
          <div className="row pb-0 flex items-center justify-between">
            <p className="section-label">Coming up ({DUE_SOON_DAYS} days)</p>
            <Amount minor={dueSoonTotal} className="text-[13px] text-muted" />
          </div>
          {dueSoon.slice(0, 4).map((d) => (
            <Link key={d.key} href={d.href} className="row row-link flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] truncate">{d.title}</p>
                <p className={`text-[13px] ${d.due_on < today ? "text-alarm" : "text-muted"}`}>
                  {d.due_on < today ? "Past due · " : ""}
                  {formatShortDate(d.due_on)}
                </p>
              </div>
              <Amount minor={d.minor} className="shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {hasAnyActivity && (
        <div className="card row">
          <p className="section-label mb-3">Spending, last {TREND_MONTHS} months</p>
          <SpendTrend points={trend} />
        </div>
      )}

      {budgets.length > 0 && (
        <Link href="/budgets" className="card row row-link block">
          <div className="flex items-center justify-between mb-2">
            <p className="section-label">Budgets</p>
            <span className="text-[13px] text-accent font-semibold">All →</span>
          </div>
          <div className="flex items-baseline justify-between mb-2 text-[15px]">
            <Amount minor={budgetSpent} className="font-semibold" />
            <span className="text-muted num text-[13px]">of {formatMoney(budgetTotal)}</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              data-tone={budgetPercent > 100 ? "alarm" : budgetPercent > 85 ? "urgent" : undefined}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          {overBudget.length > 0 && (
            <p className="text-[13px] text-alarm mt-2">
              {overBudget.length} {overBudget.length === 1 ? "category is" : "categories are"} over budget
            </p>
          )}
        </Link>
      )}

      {slices.length > 0 && (
        <div className="card row">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Where it went</p>
            <Link href="/insights" className="text-[13px] text-accent font-semibold">
              Insights →
            </Link>
          </div>
          <CategoryBars slices={slices} limit={5} />
        </div>
      )}

      <div className="card">
        <Link href="/net-worth" className="row row-link flex items-center justify-between">
          <div>
            <p className="section-label mb-1">Net worth</p>
            <Amount
              minor={netWorth}
              className={`text-[20px] font-semibold ${netWorth < 0n ? "text-alarm" : ""}`}
            />
            {totalDebt > 0n && (
              <p className="text-[13px] text-muted mt-0.5">
                after {formatMoney(totalDebt)} owed on cards
              </p>
            )}
          </div>
          <span className="text-[13px] text-accent font-semibold">History →</span>
        </Link>
        {(balancesRes.data ?? []).map((a, i) => (
          <Link
            key={a.account_id}
            href={`/accounts/${a.account_id}`}
            className="row row-link flex items-center gap-3"
          >
            <AccountSwatch name={a.name ?? "?"} index={i} />
            <span className="text-[15px] flex-1 truncate">{a.name}</span>
            <Amount
              minor={BigInt(a.balance_minor ?? 0)}
              className={a.is_liability && (a.balance_minor ?? 0) < 0 ? "text-alarm" : ""}
            />
          </Link>
        ))}
        {(balancesRes.data ?? []).length === 0 && (
          <p className="row text-[14px] text-muted">No accounts yet — add one in Settings.</p>
        )}
      </div>

      {nextDue && (
        <Link href={`/bills/${nextDue.obligation_id}`} className="card row row-link block">
          <div className="flex items-center justify-between mb-2">
            <p className="section-label">Next bill due</p>
            <span className="text-[13px] text-accent font-semibold">All bills →</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[15px] font-medium truncate">{nextDue.title}</p>
              <p className={`text-[13px] ${nextDue.is_past_due ? "text-alarm" : "text-muted"}`}>
                {nextDue.is_past_due
                  ? `${Math.abs(nextDue.days_until_due ?? 0)} days past due`
                  : nextDue.due_on
                    ? `${nextDue.days_until_due} days left · ${formatShortDate(nextDue.due_on)}`
                    : "No due date"}
              </p>
            </div>
            <Amount
              minor={BigInt(nextDue.amount_remaining_usd_minor ?? 0)}
              className={`shrink-0 font-semibold ${nextDue.is_past_due ? "text-alarm" : ""}`}
            />
          </div>
        </Link>
      )}

      <div className="card">
        <div className="row pb-0 flex items-center justify-between">
          <p className="section-label">Recent</p>
          <Link href="/ledger" className="text-[13px] text-accent font-semibold">
            All →
          </Link>
        </div>
        {recent.length === 0 && <p className="row text-[14px] text-muted">Nothing logged yet.</p>}
        {recent.map((t) => (
          <TransactionRow key={t.id} transaction={t} accounts={accounts} categories={categories} />
        ))}
      </div>
    </div>
  );
}
