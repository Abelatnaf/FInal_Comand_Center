import { Glass } from "@/components/glass/Glass";
import { StatCard } from "@/components/glass/StatCard";
import { createClient } from "@/lib/supabase/server";
import { fmtUsd } from "@/lib/format";

function startOfMonthIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const FALL_TICKS = ["MATRICULATION", "RAT ORIENTATION", "THANKSGIVING FURLOUGH", "FALL FINALS"];
const SPRING_TICKS = ["SPRING BEGINS", "SPRING FURLOUGH", "SPRING EXAMS", "NEW MARKET DAY"];

export default async function CommandDeckPage() {
  const supabase = await createClient();
  const monthStart = startOfMonthIso();

  const [
    settingsRes,
    balanceRes,
    budgetRes,
    categoryRes,
    semestersRes,
    recurringRes,
    savingsRes,
    monthTxRes,
    monthIncomeRes,
  ] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase.from("account_balance").select("current_balance").single(),
    supabase.from("budget_vs_actual_this_month").select("*").order("sort_order"),
    supabase.from("life_to_date_spend_by_category").select("*").order("sort_order"),
    supabase.from("semester_pacing").select("*").order("start_date"),
    supabase.from("recurring_bills").select("monthly_cost_usd").eq("active", true),
    supabase.from("savings_goals").select("saved_so_far_usd"),
    supabase.from("transactions").select("amount_usd, necessity").gte("date", monthStart),
    supabase.from("income").select("amount_usd").gte("date", monthStart),
  ]);

  const settings = settingsRes.data;
  const currentBalance = balanceRes.data?.current_balance ?? 0;
  const budgetRows = budgetRes.data ?? [];
  const categoryRows = categoryRes.data ?? [];
  const semesters = semestersRes.data ?? [];

  const thisMonthSpent = (monthTxRes.data ?? []).reduce((s, t) => s + (t.amount_usd ?? 0), 0);
  const thisMonthDiscretionary = (monthTxRes.data ?? [])
    .filter((t) => t.necessity === "Discretionary")
    .reduce((s, t) => s + (t.amount_usd ?? 0), 0);
  const thisMonthIncome = (monthIncomeRes.data ?? []).reduce((s, i) => s + (i.amount_usd ?? 0), 0);
  const netThisMonth = thisMonthIncome - thisMonthSpent;

  const monthlyBurn = (recurringRes.data ?? []).reduce((s, b) => s + b.monthly_cost_usd, 0);
  const totalSaved = (savingsRes.data ?? []).reduce((s, g) => s + g.saved_so_far_usd, 0);
  const discretionaryPercent = thisMonthSpent > 0 ? Math.round((thisMonthDiscretionary / thisMonthSpent) * 100) : 0;

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const activeSemester = semesters.find((s) => todayIso >= s.start_date! && todayIso <= s.end_date!);
  const semesterStatus = activeSemester?.status ?? "Off-Semester";

  const matriculationDate = settings?.matriculation_date ? new Date(settings.matriculation_date) : null;
  const cadetWeek = matriculationDate
    ? Math.floor((now.getTime() - matriculationDate.getTime()) / (7 * 86400000)) + 1
    : null;

  const totalWeeksInSemester = activeSemester
    ? Math.ceil((activeSemester.total_days ?? 0) / 7)
    : null;
  const weekOfSemester = activeSemester
    ? Math.floor((activeSemester.elapsed_days ?? 0) / 7) + 1
    : null;
  const progressPercent = activeSemester?.elapsed_percent ?? 0;
  const ticks = activeSemester?.name === "Spring 2027" ? SPRING_TICKS : FALL_TICKS;

  const ringCircumference = 238.7;
  const ringOffset = ringCircumference * (1 - discretionaryPercent / 100);

  return (
    <div>
      <div className="eyebrow mb-3">
        <span className="dot" />
        LIVE · CADET WEEK {cadetWeek ?? "—"}
        {totalWeeksInSemester ? ` OF ${totalWeeksInSemester}` : ""}
      </div>
      <h1 className="font-display text-[32px] md:text-[42px] font-semibold mb-1.5">
        Command Deck
      </h1>
      <p className="text-text-dim text-[15px] mb-10">{activeSemester?.name ?? "Off-Semester"}</p>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <div className="ledger md:col-span-8 p-8 flex flex-col justify-between min-h-[220px]">
          <div className="relative z-10">
            <div className="stat-label mb-3.5">Current Balance</div>
            <div className="hero-value">{fmtUsd(currentBalance)}</div>
          </div>
          <div className="relative z-10 flex flex-wrap gap-7 mt-6 num text-[13px] text-text-dim pt-4 border-t border-[var(--divider)]">
            <div>
              FX RATE <b className="text-text font-semibold">{settings?.fx_rate ?? "—"} ETB/USD</b>
            </div>
            <div>
              MONTHLY BURN <b className="text-text font-semibold">{fmtUsd(monthlyBurn)}</b>
            </div>
            <div>
              SEMESTER STATUS <b className="text-text font-semibold">{semesterStatus.toUpperCase()}</b>
            </div>
          </div>
        </div>

        <StatCard
          label="This month income"
          value={fmtUsd(thisMonthIncome)}
          delta="LIFE-TO-DATE · ETB→USD AUTO-CONVERTED"
          badge={netThisMonth >= 0 ? "↑ NET POSITIVE" : "↓ NET NEGATIVE"}
          className="md:col-span-4"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <StatCard label="This month spent" value={fmtUsd(thisMonthSpent)} size="small" className="md:col-span-3" />
        <StatCard label="Total saved (goals)" value={fmtUsd(totalSaved)} size="small" className="md:col-span-3" />
        <Glass className="md:col-span-6 p-6 flex items-center gap-5">
          <div className="relative w-[88px] h-[88px] shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
              <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle
                cx="44"
                cy="44"
                r="38"
                fill="none"
                stroke="url(#ring-gradient)"
                strokeWidth="8"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0a84ff" />
                  <stop offset="100%" stopColor="#64d2ff" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center num text-base font-semibold text-tint">
              {discretionaryPercent}%
            </div>
          </div>
          <div>
            <div className="stat-label mb-1">Discretionary spend</div>
            <div className="text-text-dim text-[13px] num">
              {fmtUsd(thisMonthDiscretionary)} discretionary this month
            </div>
          </div>
        </Glass>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Glass className="p-6">
          <div className="font-display text-lg font-semibold mb-4">Budget vs Actual — This Month</div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-text-dim text-left">
                <th className="font-normal pb-2">Category</th>
                <th className="font-normal pb-2 text-right">Budget</th>
                <th className="font-normal pb-2 text-right">Actual</th>
              </tr>
            </thead>
            <tbody className="num">
              {budgetRows.map((row) => (
                <tr key={row.category_id} className="border-t border-[#2c2c2e]">
                  <td className="py-2 text-text-dim font-sans">{row.category}</td>
                  <td className="py-2 text-right">{fmtUsd(row.budget ?? 0)}</td>
                  <td className="py-2 text-right">{fmtUsd(row.actual ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Glass>
        <Glass className="p-6">
          <div className="font-display text-lg font-semibold mb-4">Life-to-Date Spend by Category</div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-text-dim text-left">
                <th className="font-normal pb-2">Category</th>
                <th className="font-normal pb-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="num">
              {categoryRows.map((row) => (
                <tr key={row.category_id} className="border-t border-[#2c2c2e]">
                  <td className="py-2 text-text-dim font-sans">{row.category}</td>
                  <td className="py-2 text-right">{fmtUsd(row.total ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Glass>
      </div>

      <Glass className="p-7 md:p-8">
        <div className="flex justify-between items-baseline mb-5 flex-wrap gap-2">
          <div className="font-display text-lg font-semibold">Cadet Week Progress</div>
          <div className="eyebrow">
            WEEK <b className="text-text">{weekOfSemester ?? "—"}</b> OF{" "}
            <b className="text-text">{totalWeeksInSemester ?? "—"}</b>
          </div>
        </div>
        <div className="liquid-track">
          <div className="liquid-fill" style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
        </div>
        <div className="relative h-2 mt-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <span
              key={i}
              className="absolute top-0 w-px h-2 bg-text-faint"
              style={{ left: `${i * 12.5}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5 num text-[10px] text-text-faint">
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </Glass>
    </div>
  );
}
