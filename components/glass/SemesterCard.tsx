"use client";

import { useState, useTransition } from "react";
import { Glass } from "./Glass";
import { fmtUsd } from "@/lib/format";
import { DatePicker } from "@/components/ui/DatePicker";
import { updatePeriod, deletePeriod } from "@/app/(app)/semester-planner/actions";

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
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      const res = await updatePeriod(semester.id, formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setEditing(false);
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${semester.name}"?`)) return;
    startTransition(async () => {
      const res = await deletePeriod(semester.id);
      if (res?.error) setError(res.error);
    });
  }

  if (editing) {
    return (
      <Glass className="p-7">
        <form action={handleUpdate} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className="stat-label block mb-1 text-[10px]">Name</label>
            <input name="name" defaultValue={semester.name} required className="input !py-1.5 !px-2 text-sm w-full" />
          </div>
          <div className="w-36">
            <label className="stat-label block mb-1 text-[10px]">Start</label>
            <DatePicker name="start_date" defaultValue={semester.start_date} required className="!py-1.5 !px-2 text-sm" />
          </div>
          <div className="w-36">
            <label className="stat-label block mb-1 text-[10px]">End</label>
            <DatePicker name="end_date" defaultValue={semester.end_date} required className="!py-1.5 !px-2 text-sm" />
          </div>
          <div className="flex gap-1.5">
            <button type="submit" disabled={pending} className="btn btn-primary !py-1.5 !px-3 text-xs">
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn !py-1.5 !px-3 text-xs">
              Cancel
            </button>
          </div>
        </form>
        {error && <p className="text-text-dim text-xs mt-2">{error}</p>}
      </Glass>
    );
  }

  const elapsed = Math.min(100, Math.max(0, semester.elapsed_percent ?? 0));
  const remaining = semester.budget - semester.actual_spend;

  return (
    <Glass className="p-7">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-2">
        <div>
          <div className="ios-title3 mb-1">{semester.name}</div>
          <div className="text-text-dim text-xs num">
            {semester.start_date} — {semester.end_date}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="badge">{semester.status}</div>
          <button onClick={() => setEditing(true)} className="link-action text-[13px]">
            Edit
          </button>
          <button onClick={handleDelete} className="link-destructive text-[13px]">
            Delete
          </button>
        </div>
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
          <div className="text-text font-semibold">{fmtUsd(remaining)}</div>
        </div>
      </div>
    </Glass>
  );
}
