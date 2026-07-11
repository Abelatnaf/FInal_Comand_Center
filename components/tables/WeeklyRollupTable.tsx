import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";
import type { WeeklyRow } from "@/components/charts/WeeklyRollupCharts";

export function WeeklyRollupTable({ rows }: { rows: WeeklyRow[] }) {
  return (
    <Glass className="overflow-x-auto">
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="text-text-dim text-left text-xs">
            <th className="py-3 px-2 font-normal">Wk</th>
            <th className="py-3 px-2 font-normal">Week Start</th>
            <th className="py-3 px-2 font-normal">Week End</th>
            <th className="py-3 px-2 font-normal text-right">Expenses</th>
            <th className="py-3 px-2 font-normal text-right">Necessary</th>
            <th className="py-3 px-2 font-normal text-right">Discretionary</th>
            <th className="py-3 px-2 font-normal text-right">Income</th>
            <th className="py-3 px-2 font-normal text-right">Net</th>
            <th className="py-3 px-2 font-normal text-right">Running Balance</th>
          </tr>
        </thead>
        <tbody className="num">
          {rows.map((r) => (
            <tr key={r.cadet_week} className="border-t border-[#241c14]">
              <td className="py-2 px-2 text-text-dim">{r.cadet_week}</td>
              <td className="py-2 px-2 text-text-dim text-xs whitespace-nowrap">{r.week_start}</td>
              <td className="py-2 px-2 text-text-dim text-xs whitespace-nowrap">{r.week_end}</td>
              <td className="py-2 px-2 text-right">{fmtUsd(r.total_expenses)}</td>
              <td className="py-2 px-2 text-right text-text-dim">{fmtUsd(r.necessary)}</td>
              <td className="py-2 px-2 text-right text-text-dim">{fmtUsd(r.discretionary)}</td>
              <td className="py-2 px-2 text-right">{fmtUsd(r.total_income)}</td>
              <td className="py-2 px-2 text-right">{fmtUsd(r.net)}</td>
              <td className="py-2 px-2 text-right text-brass font-medium">{fmtUsd(r.running_balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Glass>
  );
}
