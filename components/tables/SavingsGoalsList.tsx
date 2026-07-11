"use client";

import { useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";
import { addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from "@/app/(app)/savings-goals/actions";

export type GoalRow = {
  id: string;
  name: string;
  target_amount_usd: number;
  target_date: string | null;
  saved_so_far_usd: number;
  remaining: number;
  percent_complete: number;
  monthly_needed: number | null;
};

function GoalForm({
  defaults,
  onSubmit,
  onCancel,
  pending,
}: {
  defaults?: Partial<GoalRow>;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
  pending: boolean;
}) {
  return (
    <form action={onSubmit} className="flex flex-wrap gap-2 items-end">
      <div className="flex-1 min-w-[140px]">
        <label className="stat-label block mb-1 text-[10px]">Goal Name</label>
        <input name="name" defaultValue={defaults?.name ?? ""} required className="input !py-1.5 !px-2 text-sm w-full" />
      </div>
      <div className="w-28">
        <label className="stat-label block mb-1 text-[10px]">Target $</label>
        <input
          name="target_amount_usd"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaults?.target_amount_usd ?? ""}
          required
          className="input !py-1.5 !px-2 text-sm num"
        />
      </div>
      <div>
        <label className="stat-label block mb-1 text-[10px]">Target Date</label>
        <input name="target_date" type="date" defaultValue={defaults?.target_date ?? ""} className="input !py-1.5 !px-2 text-sm" />
      </div>
      <div className="w-28">
        <label className="stat-label block mb-1 text-[10px]">Saved So Far</label>
        <input
          name="saved_so_far_usd"
          type="number"
          step="0.01"
          min="0"
          defaultValue={defaults?.saved_so_far_usd ?? 0}
          className="input !py-1.5 !px-2 text-sm num"
        />
      </div>
      <div className="flex gap-1.5">
        <button type="submit" disabled={pending} className="btn btn-primary !py-1.5 !px-3 text-xs">
          {pending ? "Saving…" : "Save"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn !py-1.5 !px-3 text-xs">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function GoalCard({ goal }: { goal: GoalRow }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      const res = await updateSavingsGoal(goal.id, formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setEditing(false);
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${goal.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteSavingsGoal(goal.id);
      if (res?.error) setError(res.error);
    });
  }

  if (editing) {
    return (
      <Glass className="p-5">
        <GoalForm defaults={goal} onSubmit={handleUpdate} onCancel={() => setEditing(false)} pending={pending} />
        {error && <p className="text-text-dim text-xs mt-2">{error}</p>}
      </Glass>
    );
  }

  const pct = Math.min(100, Math.max(0, goal.percent_complete));

  return (
    <Glass className="p-5">
      <div className="flex justify-between items-baseline mb-3">
        <div className="font-display text-base font-medium">{goal.name}</div>
        <div className="flex gap-3">
          <button onClick={() => setEditing(true)} className="text-text-dim hover:text-text text-xs">
            Edit
          </button>
          <button onClick={handleDelete} className="text-text-dim hover:text-text text-xs">
            Delete
          </button>
        </div>
      </div>

      <div className="liquid-track mb-2">
        <div className="liquid-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="flex justify-between num text-xs text-text-dim mb-4">
        <span>{fmtUsd(goal.saved_so_far_usd)} saved</span>
        <span>{pct.toFixed(0)}%</span>
        <span>{fmtUsd(goal.target_amount_usd)} target</span>
      </div>

      <div className="grid grid-cols-3 gap-3 num text-sm">
        <div>
          <div className="text-text-dim text-[11px] mb-1">Remaining</div>
          <div className="text-text-dim">{fmtUsd(goal.remaining)}</div>
        </div>
        <div>
          <div className="text-text-dim text-[11px] mb-1">Target Date</div>
          <div className="text-text-dim">{goal.target_date ?? "—"}</div>
        </div>
        <div>
          <div className="text-text-dim text-[11px] mb-1">Monthly Needed</div>
          <div className="text-text-dim">{goal.monthly_needed !== null ? fmtUsd(goal.monthly_needed) : "—"}</div>
        </div>
      </div>
    </Glass>
  );
}

export function SavingsGoalsList({ goals }: { goals: GoalRow[] }) {
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const res = await addSavingsGoal(formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setAdding(false);
      }
    });
  }

  return (
    <div>
      <Glass className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="font-display text-lg font-medium">Goals</div>
          {!adding && (
            <button onClick={() => setAdding(true)} className="btn text-sm">
              + Add Goal
            </button>
          )}
        </div>
        {adding && (
          <div className="mt-4">
            <GoalForm onSubmit={handleAdd} onCancel={() => setAdding(false)} pending={pending} />
            {error && <p className="text-text-dim text-xs mt-2">{error}</p>}
          </div>
        )}
      </Glass>

      {goals.length === 0 ? (
        <Glass className="p-8 text-center text-text-dim text-sm">No savings goals yet.</Glass>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
      )}
    </div>
  );
}
