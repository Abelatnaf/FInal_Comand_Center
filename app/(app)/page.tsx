import { Glass } from "@/components/glass/Glass";
import { StatCard } from "@/components/glass/StatCard";
import { createClient } from "@/lib/supabase/server";
import { fmtUsd } from "@/lib/format";

function startOfMonthIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const FALL_TICKS = ["Matriculation", "Rat Orientation", "Thanksgiving", "Fall Finals"];
const SPRING_TICKS = ["Spring Begins", "Spring Furlough", "Spring Exams", "New Market Day"];

function InsetList({
  rows,
}: {
  rows: { key: string | number; label: string; values: string[] }[];
}) {
  return (
    <div className="glass px-1.5 py-1">
      {rows.map((row, i) => (
        <div key={row.key}>
          {i > 0 && <div className="h-px bg-[var(--separator)] ml-3.5" />}
          <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
            <span className="ios-subhead text-text">{row.label}</span>
            <span className="flex gap-6">
              {row.values.map((v, vi) => (
                <span key={vi} className="ios-subhead num text-text-dim min-w-[64px] text-right">
                  {v}
                </span>
              ))}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

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

  const totalWeeksInSemester = activeSemester ? Math.ceil((activeSemester.total_days ?? 0) / 7) : null;
  const weekOfSemester = activeSemester ? Math.floor((activeSemester.elapsed_days ?? 0) / 7) + 1 : null;
  const progressPercent = activeSemester?.elapsed_percent ?? 0;
  const ticks = activeSemester?.name === "Spring 2027" ? SPRING_TICKS : FALL_TICKS;

  const ringCircumference = 238.7;
  const ringOffset = ringCircumference * (1 - discretionaryPercent / 100);

  return (
    <div>
      <h1 className="ios-large-title">Command Deck</h1>
      <div className="eyebrow mt-1.5 mb-7">
        <span className="dot" />
        {activeSemester?.name ?? "Off-Semester"}
        {cadetWeek !== null ? ` · Cadet Week ${cadetWeek}${totalWeeksInSemester ? ` of ${totalWeeksInSemester}` : ""}` : ""}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <div className="ledger md:col-span-8 p-7 flex flex-col justify-between min-h-[196px]">
          <div>
            <div className="stat-label">Current Balance</div>
            <div className="hero-value mt-1">{fmtUsd(currentBalance)}</div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-[var(--separator)]">
            <div>
              <div className="stat-label !text-[12px]">FX Rate</div>
              <div className="num text-[15px] font-semibold mt-0.5">{settings?.fx_rate ?? "—"} ETB/USD</div>
            </div>
            <div>
              <div className="stat-label !text-[12px]">Monthly Burn</div>
              <div className="num text-[15px] font-semibold mt-0.5">{fmtUsd(monthlyBurn)}</div>
            </div>
            <div>
              <div className="stat-label !text-[12px]">Semester</div>
              <div className="text-[15px] font-semibold mt-0.5">{semesterStatus}</div>
            </div>
          </div>
        </div>

        <StatCard
          label="This month income"
          value={fmtUsd(thisMonthIncome)}
          delta="Auto-converted from ETB"
          badge={netThisMonth >= 0 ? "↑ Net positive" : "↓ Net negative"}
          className="md:col-span-4"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <StatCard label="This month spent" value={fmtUsd(thisMonthSpent)} size="small" className="md:col-span-3" />
        <StatCard label="Total saved" value={fmtUsd(totalSaved)} size="small" className="md:col-span-3" />
        <Glass className="md:col-span-6 p-6 flex items-center gap-5">
          <div className="relative w-[84px] h-[84px] shrink-0">
            <svg width="84" height="84" viewBox="0 0 88 88" className="-rotate-90">
              <circle cx="44" cy="44" r="38" fill="none" stroke="var(--fill-tertiary)" strokeWidth="8" />
              <circle
                cx="44"
                cy="44"
                r="38"
                fill="none"
                stroke="var(--blue)"
                strokeWidth="8"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center num text-lg font-semibold text-tint">
              {discretionaryPercent}%
            </div>
          </div>
          <div>
            <div className="ios-headline">Discretionary spend</div>
            <div className="stat-label mt-1 num">{fmtUsd(thisMonthDiscretionary)} this month</div>
          </div>
        </Glass>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="section-header mb-2 ml-1">Budget vs Actual — This Month</div>
          <InsetList
            rows={budgetRows.map((row) => ({
              key: row.category_id ?? row.category ?? "",
              label: row.category ?? "—",
              values: [fmtUsd(row.budget ?? 0), fmtUsd(row.actual ?? 0)],
            }))}
          />
        </div>
        <div>
          <div className="section-header mb-2 ml-1">Life-to-Date Spend by Category</div>
          <InsetList
            rows={categoryRows.map((row) => ({
              key: row.category_id ?? row.category ?? "",
              label: row.category ?? "—",
              values: [fmtUsd(row.total ?? 0)],
            }))}
          />
        </div>
      </div>

      <Glass className="p-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <div className="ios-headline">Cadet Week Progress</div>
          <div className="ios-subhead text-text-dim num">
            Week {weekOfSemester ?? "—"} of {totalWeeksInSemester ?? "—"}
          </div>
        </div>
        <div className="liquid-track">
          <div className="liquid-fill" style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
        </div>
        <div className="flex justify-between mt-3 text-[11px] text-text-faint">
          {ticks.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </Glass>
    </div>
  );
}
