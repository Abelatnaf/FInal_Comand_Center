import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SettingsIcon } from "@/components/nav/icons";
import { Amount } from "@/components/money/Amount";
import { TransactionRow, type TransactionRowData } from "@/components/ledger/TransactionRow";
import { CategoryBars } from "@/components/charts/CategoryBars";
import { TermBurndown, type BurndownPoint } from "@/components/charts/TermBurndown";
import { formatMoney } from "@/lib/money";
import type { Category } from "@/lib/categories";
import { formatShortDate, monthStartIso, formatMonthLong, todayIso, daysAheadIso } from "@/lib/date";

/** How far ahead a bill counts as "coming up". */
const DUE_SOON_DAYS = 14;

export default async function HomePage() {
  const supabase = await createClient();
  const thisMonth = monthStartIso(0);

  const [
    accountsRes,
    categoriesRes,
    termRes,
    positionRes,
    mealRes,
    owedRes,
    categorySpendRes,
    budgetsRes,
    obligationsRes,
    recurringRes,
    recentRes,
  ] = await Promise.all([
    supabase.from("accounts").select("id, name").eq("is_archived", false).order("name"),
    supabase
      .from("categories")
      .select("id, name, kind, color, icon, budget_usd_minor, sort_order, is_archived")
      .order("sort_order"),
    supabase
      .from("term_progress")
      .select("*")
      .lte("starts_on", todayIso())
      .gte("ends_on", todayIso())
      .maybeSingle(),
    supabase.from("liquid_position").select("*").maybeSingle(),
    supabase.from("meal_plan_progress").select("*"),
    supabase.from("owed_to_me").select("*").order("owed_minor", { ascending: false }),
    supabase.from("category_spend_by_month").select("*").eq("month", thisMonth),
    supabase.from("budget_status").select("*").not("budget_usd_minor", "is", null),
    supabase
      .from("obligation_progress")
      .select("*")
      .in("status", ["open", "partial"])
      .order("due_on", { ascending: true, nullsFirst: false }),
    supabase
      .from("recurring_entries")
      .select("id, name, amount_minor, next_due_on")
      .eq("is_active", true)
      .eq("direction", "out")
      .order("next_due_on"),
    supabase
      .from("transactions_with_week")
      .select(
        "id, occurred_on, direction, amount_minor, category_id, category_name, category_icon, category_color, note, tags, account_id, obligation_id, receipt_path, accounts(name)"
      )
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const accounts = accountsRes.data ?? [];
  const categories = (categoriesRes.data ?? []) as Category[];
  const term = termRes.data;
  const liquid = BigInt(positionRes.data?.total_liquid_usd_minor ?? 0);

  // Depends on which term you're in, so it can't join the batch above.
  const burndown: BurndownPoint[] = term?.term_id
    ? (
        await supabase
          .from("term_burndown")
          .select("day, actual_minor, ideal_minor")
          .eq("term_id", term.term_id)
          .order("day")
      ).data?.map((r) => ({
        day: r.day ?? "",
        actual: r.actual_minor == null ? null : BigInt(r.actual_minor),
        ideal: BigInt(r.ideal_minor ?? 0),
      })) ?? []
    : [];

  const owed = owedRes.data ?? [];
  const owedTotal = owed.reduce((s, o) => s + BigInt(o.owed_minor ?? 0), 0n);

  const meals = (mealRes.data ?? []).filter((m) => m.term_id === term?.term_id);

  const budgets = budgetsRes.data ?? [];
  const budgetTotal = budgets.reduce((s, b) => s + BigInt(b.budget_usd_minor ?? 0), 0n);
  const budgetSpent = budgets.reduce((s, b) => s + BigInt(b.spent_usd_minor ?? 0), 0n);
  const overBudget = budgets.filter(
    (b) => BigInt(b.spent_usd_minor ?? 0) > BigInt(b.budget_usd_minor ?? 0)
  );
  const budgetPercent = budgetTotal > 0n ? Number((budgetSpent * 100n) / budgetTotal) : 0;

  const slices = (categorySpendRes.data ?? []).map((c) => ({
    id: c.category_id ?? "",
    name: c.category_name ?? "Uncategorized",
    icon: c.category_icon,
    color: c.category_color,
    minor: BigInt(c.spent_usd_minor ?? 0),
  }));

  const today = todayIso();
  const horizon = daysAheadIso(DUE_SOON_DAYS);
  const openObligations = obligationsRes.data ?? [];
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
    tags: t.tags,
    account_id: t.account_id ?? "",
    account_name: (t.accounts as { name: string } | null)?.name ?? "—",
    obligation_id: t.obligation_id,
    receipt_path: t.receipt_path,
  }));

  const safeDaily = term?.safe_daily_minor != null ? BigInt(term.safe_daily_minor) : null;
  const actualDaily = term?.actual_daily_minor != null ? BigInt(term.actual_daily_minor) : null;
  // Positive only when the target is already out of reach. Rendering a negative
  // dollars-per-day would be a nonsense figure, so the copy changes instead.
  const shortfall = term?.shortfall_minor != null ? BigInt(term.shortfall_minor) : null;
  const targetEnd = BigInt(term?.target_end_balance_minor ?? 0);
  const expectedIncome = BigInt(term?.expected_income_minor ?? 0);
  const spentToday = BigInt(term?.spent_today_minor ?? 0);
  const todayPercent =
    safeDaily !== null && safeDaily > 0n ? Number((spentToday * 100n) / safeDaily) : null;
  const runsOutEarly =
    term?.projected_zero_on != null && term.ends_on != null && term.projected_zero_on < term.ends_on;
  const daysEarly = runsOutEarly
    ? Math.max(
        0,
        Math.round(
          (new Date(term!.ends_on!).getTime() - new Date(term!.projected_zero_on!).getTime()) / 86_400_000
        )
      )
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="page-title">{term?.name ?? formatMonthLong(thisMonth)}</h1>
        <Link href="/settings" aria-label="Settings" className="p-2 -m-2 text-muted">
          <SettingsIcon className="w-6 h-6" />
        </Link>
      </div>

      {term ? (
        <>
          <div className="card card-hero row">
            <p className="section-label mb-2">Money left</p>
            <Amount minor={liquid} className={`hero-figure block ${liquid <= 0n ? "text-alarm" : ""}`} />
            <p className="text-[14px] text-muted mt-1">
              {term.days_remaining} {term.days_remaining === 1 ? "day" : "days"} until {term.name} ends
              {term.ends_on && ` · ${formatShortDate(term.ends_on)}`}
            </p>

            {expectedIncome > 0n && (
              <p className="text-[13px] text-muted mt-1">
                Plus <Amount minor={expectedIncome} className="text-positive" /> still due in before it
                ends.
              </p>
            )}

            {safeDaily !== null && (
              <div className="flex gap-6 mt-4 pt-4 border-t">
                <div>
                  <p className="section-label">Safe to spend</p>
                  <Amount minor={safeDaily} className="text-[17px] font-semibold" />
                  <p className="text-[12px] text-faint">
                    a day{targetEnd > 0n && `, keeping ${formatMoney(targetEnd)}`}
                  </p>
                </div>
                {actualDaily !== null && (
                  <div>
                    <p className="section-label">You&rsquo;re spending</p>
                    <Amount
                      minor={actualDaily}
                      className={`text-[17px] font-semibold ${
                        actualDaily > safeDaily ? "text-alarm" : "text-positive"
                      }`}
                    />
                    <p className="text-[12px] text-faint">a day</p>
                  </div>
                )}
              </div>
            )}

            {/* A target you can no longer reach is a real state, and it is not
                the same as "spend nothing" -- say the gap outright. */}
            {shortfall !== null && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-[15px] text-alarm font-medium">
                  You&rsquo;re {formatMoney(shortfall)} short of the {formatMoney(targetEnd)} you wanted
                  left over.
                </p>
                <p className="text-[13px] text-muted mt-1">
                  There&rsquo;s no daily figure that gets you there from here — either lower the target on{" "}
                  {term.name}, or find another {formatMoney(shortfall)} before it ends.
                </p>
              </div>
            )}
          </div>

          {/* The decision-shaped version of the same number: not "what's my
              term average", but "can I spend $20 right now". A single ratio
              against a limit is a meter, not a chart. */}
          {safeDaily !== null && todayPercent !== null && (
            <div className="card row">
              <div className="flex items-baseline justify-between mb-2">
                <p className="section-label">Today</p>
                <p className="text-[13px] text-muted num">
                  {formatMoney(spentToday)} of {formatMoney(safeDaily)}
                </p>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  data-tone={todayPercent > 100 ? "alarm" : todayPercent > 85 ? "urgent" : undefined}
                  style={{ width: `${Math.min(todayPercent, 100)}%` }}
                />
              </div>
              <p
                className={`text-[13px] mt-2 ${
                  spentToday > safeDaily ? "text-alarm" : "text-muted"
                }`}
              >
                {spentToday > safeDaily
                  ? `${formatMoney(spentToday - safeDaily)} over today's pace.`
                  : `${formatMoney(safeDaily - spentToday)} left today.`}
              </p>
            </div>
          )}

          {burndown.length > 1 && (
            <div className="card row">
              <p className="section-label mb-3">Money left, day by day</p>
              <TermBurndown points={burndown} />
            </div>
          )}

          {/* The single most useful thing this screen can say. Stated outright
              rather than left for the user to work out from two rates. */}
          {runsOutEarly && (
            <div className="card row">
              <p className="text-[15px] text-alarm font-medium">
                At this rate you run out on {formatShortDate(term.projected_zero_on!)}
              </p>
              <p className="text-[14px] text-muted mt-1">
                {daysEarly} {daysEarly === 1 ? "day" : "days"} before the term ends.
                {safeDaily !== null && ` Spending ${formatMoney(safeDaily)} a day instead gets you there.`}
              </p>
            </div>
          )}

          {BigInt(term.received_minor ?? 0) > 0n && (
            <div className="card row flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="section-label mb-0.5">This term so far</p>
                <p className="text-[13px] text-muted">
                  <Amount minor={BigInt(term.received_minor ?? 0)} className="text-positive" /> in ·{" "}
                  <Amount minor={BigInt(term.spent_minor ?? 0)} /> out
                </p>
              </div>
              <Link href="/reports" className="text-[13px] text-accent font-semibold shrink-0">
                Details →
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="card row flex flex-col gap-3">
          <p className="text-[15px] text-text">Set up your term to see how long your money has to last.</p>
          <p className="text-[14px] text-muted">
            Tell it when the semester starts and ends, and this screen becomes &ldquo;you have $X and Y days
            to go&rdquo; instead of a monthly total.
          </p>
          <Link href="/semesters" className="btn btn-primary self-start">
            Add your term
          </Link>
        </div>
      )}

      {meals.map((m) => (
        <Link key={m.meal_plan_id} href="/meal-plan" className="card row row-link block">
          <div className="flex items-center justify-between mb-2">
            <p className="section-label">{m.name}</p>
            <span className="text-[13px] text-accent font-semibold">Log a swipe →</span>
          </div>
          <div className="flex gap-6">
            {BigInt(m.dining_minor ?? 0) > 0n && (
              <div>
                <Amount minor={BigInt(m.dining_minor ?? 0)} className="text-[17px] font-semibold" />
                <p className="text-[12px] text-faint">dining dollars</p>
              </div>
            )}
            {m.swipes_remaining != null && (
              <div>
                <p className="text-[17px] font-semibold num">{m.swipes_remaining}</p>
                <p className="text-[12px] text-faint">
                  swipes left
                  {m.weeks_remaining
                    ? ` · ${Math.floor(m.swipes_remaining / m.weeks_remaining)} a week`
                    : ""}
                </p>
              </div>
            )}
          </div>
        </Link>
      ))}

      {owedTotal > 0n && (
        <Link href="/split" className="card row row-link block">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="section-label mb-0.5">Owed to you</p>
              <p className="text-[13px] text-muted truncate">
                {owed.slice(0, 3).map((o) => o.person).join(", ")}
                {owed.length > 3 && ` +${owed.length - 3}`}
              </p>
            </div>
            <Amount minor={owedTotal} className="text-[17px] font-semibold text-positive shrink-0" />
          </div>
        </Link>
      )}

      {dueSoon.length > 0 && (
        <div className="card">
          <div className="row pb-0 flex items-center justify-between">
            <p className="section-label">Coming up ({DUE_SOON_DAYS} days)</p>
            <Amount minor={dueSoon.reduce((s, d) => s + d.minor, 0n)} className="text-[13px] text-muted" />
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

      {budgets.length > 0 && (
        <Link href="/budgets" className="card row row-link block">
          <div className="flex items-center justify-between mb-2">
            <p className="section-label">Budgets{budgets[0]?.is_term ? " this term" : " this month"}</p>
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
              {overBudget.length} {overBudget.length === 1 ? "category is" : "categories are"} over
            </p>
          )}
        </Link>
      )}

      {slices.length > 0 && (
        <div className="card row">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Where it went this month</p>
            <Link href="/insights" className="text-[13px] text-accent font-semibold">
              Insights →
            </Link>
          </div>
          <CategoryBars slices={slices} limit={5} />
        </div>
      )}

      <div className="card">
        <div className="row pb-0 flex items-center justify-between">
          <p className="section-label">Recent</p>
          <Link href="/ledger" className="text-[13px] text-accent font-semibold">
            All →
          </Link>
        </div>
        {recent.length === 0 && (
          <div className="row flex flex-col gap-3">
            <p className="text-[14px] text-muted">Nothing logged yet.</p>
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
        {recent.map((t) => (
          <TransactionRow key={t.id} transaction={t} accounts={accounts} categories={categories} />
        ))}
      </div>
    </div>
  );
}
