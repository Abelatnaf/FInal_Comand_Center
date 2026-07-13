import Link from "next/link";
import { Glass } from "@/components/glass/Glass";
import { AppIcon } from "@/components/ui/AppIcon";
import { NetWorthHero } from "@/components/dashboard/NetWorthHero";
import { CashFlowBars, SpendingDonut } from "@/components/charts/DashboardCharts";
import { OnboardingModal } from "@/components/OnboardingModal";
import { CardStack, type StackAccount } from "@/components/wallet/CardStack";
import { createClient } from "@/lib/supabase/server";
import { fmtUsd } from "@/lib/format";

function startOfMonthIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function shortMonth(iso: string) {
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-US", { month: "short" });
}
function shortDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const DONUT_COLORS = ["#007aff", "#34c759", "#ff9500", "#af52de", "#ff2d55", "#30b0c7", "#5856d6", "#ff3b30", "#8e8e93", "#a2845e"];

function MiniRing({ pct, color = "#34c759" }: { pct: number; color?: string }) {
  const c = 2 * Math.PI * 15;
  const off = c * (1 - Math.min(100, Math.max(0, pct)) / 100);
  return (
    <div className="relative w-11 h-11 shrink-0">
      <svg width="44" height="44" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r="15" fill="none" stroke="var(--gray5)" strokeWidth="4" />
        <circle cx="20" cy="20" r="15" fill="none" stroke={color} strokeWidth="4" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold num">{Math.round(pct)}%</div>
    </div>
  );
}

export default async function CommandDeckPage() {
  const supabase = await createClient();
  const monthStart = startOfMonthIso();

  const [
    userRes,
    balanceRes,
    monthlyRes,
    weeklyRes,
    budgetRes,
    recurringRes,
    goalsRes,
    accountsRes,
    latestSnapshotRes,
    monthTxRes,
    monthIncomeRes,
    onboardingRes,
    txCountRes,
    incomeCountRes,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("account_balance").select("current_balance").single(),
    supabase.from("monthly_rollup").select("month, running_balance").order("month"),
    supabase.from("weekly_rollup").select("week_start, total_income, total_expenses").order("week_number").limit(12),
    supabase.from("budget_vs_actual_this_month").select("*").order("sort_order"),
    supabase.from("recurring_bills").select("id, name, monthly_cost_usd, billing_day").eq("active", true),
    supabase.from("savings_goal_progress").select("*").order("target_date").limit(4),
    supabase.from("accounts").select("id, name, starting_balance, kind").order("sort_order"),
    supabase.from("net_worth_snapshots").select("id").order("snapshot_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("transactions").select("amount_usd, necessity").gte("date", monthStart),
    supabase.from("income").select("amount_usd").gte("date", monthStart),
    supabase.from("settings").select("onboarding_dismissed").single(),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
    supabase.from("income").select("id", { count: "exact", head: true }),
  ]);

  const showOnboarding =
    !onboardingRes.data?.onboarding_dismissed && (txCountRes.count ?? 0) === 0 && (incomeCountRes.count ?? 0) === 0;

  const currentBalance = balanceRes.data?.current_balance ?? 0;
  const firstName = userRes.data.user?.email?.split("@")[0] ?? "there";

  const snapshotDetail = latestSnapshotRes.data
    ? (await supabase.from("net_worth_snapshot_detail").select("account_id, amount").eq("snapshot_id", latestSnapshotRes.data.id)).data ?? []
    : [];
  const detailByAccount = new Map(snapshotDetail.map((d) => [d.account_id, d.amount]));

  const series = (monthlyRes.data ?? [])
    .filter((r) => r.month && r.running_balance !== null)
    .map((r) => ({ label: shortMonth(r.month!), value: r.running_balance ?? 0 }));

  const cashFlow = (weeklyRes.data ?? []).map((r) => ({
    label: r.week_start ? shortDay(r.week_start) : "",
    income: r.total_income ?? 0,
    expense: r.total_expenses ?? 0,
  }));

  const thisMonthSpent = (monthTxRes.data ?? []).reduce((s, t) => s + (t.amount_usd ?? 0), 0);
  const thisMonthDiscretionary = (monthTxRes.data ?? [])
    .filter((t) => t.necessity === "Discretionary")
    .reduce((s, t) => s + (t.amount_usd ?? 0), 0);
  const thisMonthIncome = (monthIncomeRes.data ?? []).reduce((s, i) => s + (i.amount_usd ?? 0), 0);
  const netThisMonth = thisMonthIncome - thisMonthSpent;
  const discretionaryShare = thisMonthSpent > 0 ? Math.round((thisMonthDiscretionary / thisMonthSpent) * 100) : 0;

  const donut = (budgetRes.data ?? [])
    .map((r, i) => ({ name: r.category ?? "—", value: r.actual ?? 0, color: DONUT_COLORS[i % DONUT_COLORS.length] }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const donutTotal = donut.reduce((s, d) => s + d.value, 0);

  const accounts = (accountsRes.data ?? []).map((a, i) => ({
    name: a.name,
    value: detailByAccount.get(a.id) ?? a.starting_balance,
    isLiability: a.kind === "liability",
    color: DONUT_COLORS[i % DONUT_COLORS.length],
    glyph: "bank" as const,
  }));
  const accountsTotal = accounts.reduce((s, a) => s + (a.isLiability ? -a.value : a.value), 0);

  const stackAccounts: StackAccount[] = (accountsRes.data ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    balance: detailByAccount.get(a.id) ?? a.starting_balance,
    kind: a.kind === "liability" ? "liability" : "asset",
  }));

  const now = new Date();
  const today = now.getDate();
  const upcoming = (recurringRes.data ?? [])
    .filter((b) => b.billing_day)
    .map((b) => {
      const day = b.billing_day!;
      const daysUntil = day >= today ? day - today : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - today + day;
      const dateObj = new Date(now.getFullYear(), now.getMonth() + (day >= today ? 0 : 1), day);
      return { ...b, daysUntil, dateObj };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 4);

  const goals = goalsRes.data ?? [];

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div>
      {showOnboarding && <OnboardingModal />}

      {/* Greeting */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="ios-large-title">{greeting}, {firstName}.</h1>
          <p className="ios-subhead text-text-dim mt-1">Here&apos;s your financial overview for today.</p>
        </div>
        <p className="ios-subhead text-text-dim mt-2">{dateLabel}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <NetWorthHero balance={currentBalance} series={series} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Cash flow */}
            <Glass className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="ios-headline">Cash Flow</div>
                  <div className="stat-label">This Month</div>
                </div>
                <div className="flex gap-3 items-center text-[12px]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#34c759" }} />Income</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#ff3b30" }} />Expenses</span>
                </div>
              </div>
              <div className="flex gap-6 mt-3">
                <div>
                  <div className="stat-label">Income</div>
                  <div className="text-[18px] font-semibold num pos">{fmtUsd(thisMonthIncome)}</div>
                </div>
                <div>
                  <div className="stat-label">Expenses</div>
                  <div className="text-[18px] font-semibold num neg">{fmtUsd(thisMonthSpent)}</div>
                </div>
                <div>
                  <div className="stat-label">Net</div>
                  <div className="text-[18px] font-semibold num">{fmtUsd(netThisMonth)}</div>
                </div>
              </div>
              <div className="h-[150px] mt-3">
                <CashFlowBars data={cashFlow} />
              </div>
            </Glass>

            {/* Spending breakdown */}
            <Glass className="p-5">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="ios-headline">Spending</div>
                  <div className="stat-label">This Month</div>
                </div>
                <Link href="/monthly-rollup" className="link-action text-[13px]">
                  Details
                </Link>
              </div>
              <SpendingDonut data={donut} centerLabel="Total" centerValue={fmtUsd(donutTotal)} />
              <div className="flex flex-col gap-1.5 mt-2">
                {donut.slice(0, 4).map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-[13px]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-text truncate flex-1">{d.name}</span>
                    <span className="num text-text-dim">{fmtUsd(d.value)}</span>
                  </div>
                ))}
                {donut.length === 0 && <div className="stat-label text-center py-2">No spending logged yet.</div>}
              </div>
            </Glass>
          </div>

          {/* Goals */}
          <Glass className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="ios-headline">Savings Goals</div>
              <Link href="/savings-goals" className="link-action text-[13px]">
                View All
              </Link>
            </div>
            {goals.length === 0 ? (
              <div className="stat-label py-2">No savings goals yet.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {goals.map((g, i) => (
                  <div key={g.id} className="flex items-center gap-3">
                    <MiniRing pct={g.percent_complete ?? 0} color={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    <div className="min-w-0">
                      <div className="ios-subhead text-text font-medium truncate">{g.name}</div>
                      <div className="stat-label num">
                        {fmtUsd(g.saved_so_far_usd ?? 0)} of {fmtUsd(g.target_amount_usd ?? 0)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Glass>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Accounts — card stack */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="ios-headline">Accounts</div>
              <Link href="/net-worth" className="link-action text-[13px]">
                View All
              </Link>
            </div>
            <CardStack accounts={stackAccounts} />
            <div className="flex items-baseline justify-between px-1 pt-3 mt-1 border-t border-[var(--separator)]">
              <span className="stat-label">Net Worth</span>
              <span className="text-[17px] font-bold num">{fmtUsd(accountsTotal)}</span>
            </div>
          </div>

          {/* Upcoming */}
          <Glass className="p-5">
            <div className="ios-headline mb-2">Upcoming</div>
            {upcoming.length === 0 ? (
              <div className="stat-label py-2">Nothing scheduled.</div>
            ) : (
              <div className="flex flex-col">
                {upcoming.map((b, i) => (
                  <div key={b.id}>
                    {i > 0 && <div className="h-px bg-[var(--separator)] ml-[52px]" />}
                    <div className="flex items-center gap-3 py-2.5">
                      <div className="w-10 h-11 rounded-[10px] bg-[var(--bg-elevated-2)] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-semibold uppercase text-text-dim leading-none">{shortMonth(b.dateObj.toISOString())}</span>
                        <span className="text-[16px] font-bold leading-tight num">{b.dateObj.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="ios-subhead text-text font-medium truncate">{b.name}</div>
                        <div className="stat-label num">{fmtUsd(b.monthly_cost_usd)}</div>
                      </div>
                      <div className="stat-label whitespace-nowrap">
                        {b.daysUntil === 0 ? "Today" : `In ${b.daysUntil} day${b.daysUntil === 1 ? "" : "s"}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Glass>

          {/* Insights */}
          <Glass className="p-5">
            <div className="ios-headline mb-3">Insights</div>
            <div className="flex flex-col gap-3.5">
              <div className="flex items-start gap-3">
                <AppIcon glyph="sparkle" color="#af52de" size={30} />
                <div className="ios-subhead text-text">
                  {netThisMonth >= 0 ? "You're net positive" : "You're net negative"} this month by{" "}
                  <span className="font-semibold num">{fmtUsd(Math.abs(netThisMonth))}</span>.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AppIcon glyph="chart" color="#34c759" size={30} />
                <div className="ios-subhead text-text">
                  <span className="font-semibold num">{discretionaryShare}%</span> of this month&apos;s spending was
                  discretionary.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AppIcon glyph="cash" color="#ff9500" size={30} />
                <div className="ios-subhead text-text">
                  Your recurring burn is <span className="font-semibold num">{fmtUsd((recurringRes.data ?? []).reduce((s, b) => s + b.monthly_cost_usd, 0))}</span> / month.
                </div>
              </div>
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}
