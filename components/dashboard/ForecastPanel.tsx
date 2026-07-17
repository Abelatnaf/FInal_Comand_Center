"use client";

import { useMemo, useState } from "react";
import { Glass } from "@/components/glass/Glass";
import { StatCard } from "@/components/glass/StatCard";
import { ForecastChart, type ForecastPoint } from "@/components/charts/ForecastChart";
import { fmtUsd } from "@/lib/format";

type Month = { label: string; daysFromToday: number };

const RANGES = [
  { key: "3M", n: 3 },
  { key: "6M", n: 6 },
  { key: "12M", n: 12 },
] as const;

export function ForecastPanel({
  currentBalance,
  avgDailyOtherNet,
  recurringIncomeMonthly,
  recurringBillsMonthly,
  months,
}: {
  currentBalance: number;
  avgDailyOtherNet: number;
  recurringIncomeMonthly: number;
  recurringBillsMonthly: number;
  months: Month[];
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("6M");
  const [extraIncome, setExtraIncome] = useState("");
  const [extraExpense, setExtraExpense] = useState("");
  const [oneTimeAmount, setOneTimeAmount] = useState("");
  const [oneTimeMonth, setOneTimeMonth] = useState(0);

  const rangeN = RANGES.find((r) => r.key === range)?.n ?? 6;
  const visibleMonths = months.slice(0, rangeN);

  const hasScenario = Boolean(Number(extraIncome) || Number(extraExpense) || Number(oneTimeAmount));

  const data: ForecastPoint[] = useMemo(() => {
    const extraIncomeNum = Number(extraIncome) || 0;
    const extraExpenseNum = Number(extraExpense) || 0;
    const oneTimeNum = Number(oneTimeAmount) || 0;

    return visibleMonths.map((m, i) => {
      const cycles = i + 1;
      const baseline =
        currentBalance + avgDailyOtherNet * m.daysFromToday + cycles * recurringIncomeMonthly - cycles * recurringBillsMonthly;
      const scenarioDelta = cycles * (extraIncomeNum - extraExpenseNum) - (oneTimeMonth <= i ? oneTimeNum : 0);
      return {
        label: m.label,
        baseline,
        scenario: hasScenario ? baseline + scenarioDelta : null,
      };
    });
  }, [visibleMonths, currentBalance, avgDailyOtherNet, recurringIncomeMonthly, recurringBillsMonthly, extraIncome, extraExpense, oneTimeAmount, oneTimeMonth, hasScenario]);

  const endBaseline = data[data.length - 1]?.baseline ?? currentBalance;
  const endScenario = data[data.length - 1]?.scenario ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Current Balance" value={fmtUsd(currentBalance)} size="small" />
        <StatCard label="Recurring Income / mo" value={fmtUsd(recurringIncomeMonthly)} size="small" />
        <StatCard label="Recurring Bills / mo" value={fmtUsd(recurringBillsMonthly)} size="small" />
        <StatCard
          label={`Projected in ${rangeN} mo`}
          value={fmtUsd(hasScenario && endScenario != null ? endScenario : endBaseline)}
          delta={hasScenario ? `Baseline: ${fmtUsd(endBaseline)}` : undefined}
          size="small"
        />
      </div>

      <Glass className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="ios-headline">Projected Balance</div>
          <div className="segmented">
            {RANGES.map((r) => (
              <button key={r.key} type="button" data-active={range === r.key} onClick={() => setRange(r.key)}>
                {r.key}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 280 }}>
          <ForecastChart data={data} showScenario={hasScenario} />
        </div>
        <p className="ios-footnote text-text-dim mt-3">
          Baseline extends your recurring bills/income plus your recent day-to-day spending pace forward. It&apos;s an
          estimate, not a guarantee — it doesn&apos;t know about one-time purchases you haven&apos;t made yet.
        </p>
      </Glass>

      <Glass className="p-5">
        <div className="ios-headline mb-1">What If…</div>
        <p className="ios-footnote text-text-dim mb-4">
          Try a scenario without changing anything in your real data — these numbers only affect this chart.
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="w-40">
            <label className="stat-label block mb-1.5">Extra income / mo</label>
            <input
              value={extraIncome}
              onChange={(e) => setExtraIncome(e.target.value)}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="input text-sm num w-full"
            />
          </div>
          <div className="w-40">
            <label className="stat-label block mb-1.5">Extra expense / mo</label>
            <input
              value={extraExpense}
              onChange={(e) => setExtraExpense(e.target.value)}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="input text-sm num w-full"
            />
          </div>
          <div className="w-40">
            <label className="stat-label block mb-1.5">One-time expense</label>
            <input
              value={oneTimeAmount}
              onChange={(e) => setOneTimeAmount(e.target.value)}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="input text-sm num w-full"
            />
          </div>
          <div className="w-40">
            <label className="stat-label block mb-1.5">Hits in month</label>
            <select
              value={oneTimeMonth}
              onChange={(e) => setOneTimeMonth(Number(e.target.value))}
              className="select text-sm w-full"
            >
              {visibleMonths.map((m, i) => (
                <option key={m.label} value={i}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Glass>
    </div>
  );
}
