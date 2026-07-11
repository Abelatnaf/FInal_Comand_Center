import { Glass } from "./Glass";
import { fmtUsd } from "@/lib/format";

export type SemesterPacing = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  total_days: number;
  elapsed_days: number;
  elapsed_percent: number | null;
  actual_spend: number;
  income: number;
  budget: number;
  spend_percent: number | null;
  status: string;
};

export function SemesterCard({ semester }: { semester: SemesterPacing }) {
  const elapsed = Math.min(100, Math.max(0, semester.elapsed_percent ?? 0));
  const remaining = semester.budget - semester.actual_spend;

  return (
    <Glass className="p-7">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-2">
        <div>
          <div className="font-display text-xl font-semibold mb-1">{semester.name}</div>
          <div className="text-text-dim text-xs num">
            {semester.start_date} — {semester.end_date}
          </div>
        </div>
        <div className="badge">{semester.status.toUpperCase()}</div>
      </div>

      <div className="liquid-track mb-2">
        <div className="liquid-fill" style={{ width: `${elapsed}%` }} />
      </div>
      <div className="flex justify-between num text-[11px] text-text-dim mb-6">
        <span>ELAPSED {elapsed.toFixed(0)}%</span>
        <span>SPEND {semester.spend_percent !== null ? `${semester.spend_percent.toFixed(0)}%` : "—"} OF BUDGET</span>
      </div>

      <div className="grid grid-cols-2 gap-4 num text-sm">
        <div>
          <div className="text-text-dim text-[11px] mb-1">Income</div>
          <div className="text-text-dim">{fmtUsd(semester.income)}</div>
        </div>
        <div>
          <div className="text-text-dim text-[11px] mb-1">Budget</div>
          <div className="text-text-dim">{fmtUsd(semester.budget)}</div>
        </div>
        <div>
          <div className="text-text-dim text-[11px] mb-1">Actual Spend</div>
          <div className="text-text-dim">{fmtUsd(semester.actual_spend)}</div>
        </div>
        <div>
          <div className="text-text-dim text-[11px] mb-1">Remaining</div>
          <div className="text-tint font-medium">{fmtUsd(remaining)}</div>
        </div>
      </div>
    </Glass>
  );
}
