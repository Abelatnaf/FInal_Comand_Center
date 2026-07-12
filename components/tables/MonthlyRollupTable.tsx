import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";
import type { MonthlyCategoryPoint, MonthlyRollupRow } from "@/components/charts/MonthlyRollupCharts";

function fmtMonth(m: string) {
  return new Date(m + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function MonthlyRollupTable({
  categoryData,
  categoryNames,
  balanceData,
}: {
  categoryData: MonthlyCategoryPoint[];
  categoryNames: string[];
  balanceData: MonthlyRollupRow[];
}) {
  const balanceByMonth = new Map(balanceData.map((r) => [r.month, r]));

  return (
    <Glass className="overflow-x-auto">
      <table className="w-full text-sm min-w-[1400px]">
        <thead>
          <tr className="text-text-dim text-left text-xs">
            <th className="py-3 px-2 font-normal sticky left-0 bg-[#1c1c1e]">Month</th>
            {categoryNames.map((c) => (
              <th key={c} className="py-3 px-2 font-normal text-right whitespace-nowrap">
                {c}
              </th>
            ))}
            <th className="py-3 px-2 font-normal text-right">Total Expenses</th>
            <th className="py-3 px-2 font-normal text-right">Total Income</th>
            <th className="py-3 px-2 font-normal text-right">Net</th>
            <th className="py-3 px-2 font-normal text-right">Running Balance</th>
          </tr>
        </thead>
        <tbody className="num">
          {categoryData.map((row) => {
            const balance = balanceByMonth.get(row.month);
            return (
              <tr key={row.month} className="border-t border-[var(--separator)]">
                <td className="py-2 px-2 text-text-dim whitespace-nowrap sticky left-0 bg-[#1c1c1e]">
                  {fmtMonth(row.month)}
                </td>
                {categoryNames.map((c) => (
                  <td key={c} className="py-2 px-2 text-right text-text-dim">
                    {fmtUsd(Number(row[c] ?? 0))}
                  </td>
                ))}
                <td className="py-2 px-2 text-right">{fmtUsd(balance?.total_expenses ?? 0)}</td>
                <td className="py-2 px-2 text-right">{fmtUsd(balance?.total_income ?? 0)}</td>
                <td className="py-2 px-2 text-right">{fmtUsd(balance?.net ?? 0)}</td>
                <td className="py-2 px-2 text-right text-text font-semibold">{fmtUsd(balance?.running_balance ?? 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Glass>
  );
}
