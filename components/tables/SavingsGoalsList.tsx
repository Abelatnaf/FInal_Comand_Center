"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";
import { addSavingsGoal, updateSavingsGoal, deleteSavingsGoal } from "@/app/(app)/savings-goals/actions";
import { DatePicker } from "@/components/ui/DatePicker";

type Account = { id: string; name: string };

export type GoalRow = {
  id: string;
  name: string;
  target_amount_usd: number;
  target_date: string | null;
  saved_so_far_usd: number;
  remaining: number;
  percent_complete: number;
  monthly_needed: number | null;
  account_id: string | null;
};

function GoalForm({
  defaults,
  accounts,
  onSubmit,
  onCancel,
  pending,
}: {
  defaults?: Partial<GoalRow>;
  accounts: Account[];
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
  pending: boolean;
}) {
  const [accountId, setAccountId] = useState(defaults?.account_id ?? "");
  const isLegacyUnlinked = defaults != null && !defaults.account_id;
  const noAccounts = accounts.length === 0;

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
      <div className="w-36">
        <label className="stat-label block mb-1 text-[10px]">Target Date</label>
        <DatePicker name="target_date" defaultValue={defaults?.target_date ?? ""} placeholder="Optional" className="!py-1.5 !px-2 text-sm" />
      </div>
      <div className="w-40">
        <label className="stat-label block mb-1 text-[10px]">Track via Account</label>
        <select
          name="account_id"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          required
          disabled={noAccounts}
          className="select !py-1.5 !px-2 text-sm w-full"
        >
          <option value="" disabled>
            {noAccounts ? "Add an account first" : "Choose an account…"}
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
      {isLegacyUnlinked && (
        <p className="text-text-dim text-[12px] w-full -mt-1">
          Currently tracked manually at {defaults?.saved_so_far_usd != null ? `$${defaults.saved_so_far_usd.toFixed(2)}` : "$0.00"} — pick an account above to link it and track automatically from here on.
        </p>
      )}
      {noAccounts && (
        <p className="text-text-dim text-[12px] w-full -mt-1">
          Every goal needs an account to track — add one in Settings → Financial → Accounts first.
        </p>
      )}
      <div className="flex gap-1.5">
        <button type="submit" disabled={pending || noAccounts} className="btn btn-primary !py-1.5 !px-3 text-xs">
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

function GoalCard({ goal, accounts }: { goal: GoalRow; accounts: Account[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const linkedAccount = accounts.find((a) => a.id === goal.account_id);

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
        <GoalForm defaults={goal} accounts={accounts} onSubmit={handleUpdate} onCancel={() => setEditing(false)} pending={pending} />
        {error && <p className="text-text-dim text-xs mt-2">{error}</p>}
      </Glass>
    );
  }

  const pct = Math.min(100, Math.max(0, goal.percent_complete));

  return (
    <Glass className="p-5">
      <div className="flex justify-between items-baseline mb-4">
        <div>
          <div className="ios-headline">{goal.name}</div>
          {linkedAccount && (
            <Link href={`/accounts/${linkedAccount.id}`} className="link-action text-[12px]">
              🔗 Tracking {linkedAccount.name}
            </Link>
          )}
        </div>
        <div className="flex gap-4">
          <button onClick={() => setEditing(true)} className="link-action text-[13px]">
            Edit
          </button>
          <button onClick={handleDelete} className="link-destructive text-[13px]">
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

export function SavingsGoalsList({ goals, accounts }: { goals: GoalRow[]; accounts: Account[] }) {
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
          <div className="ios-headline">Goals</div>
          {!adding && (
            <button onClick={() => setAdding(true)} className="btn text-sm">
              + Add Goal
            </button>
          )}
        </div>
        {adding && (
          <div className="mt-4">
            <GoalForm accounts={accounts} onSubmit={handleAdd} onCancel={() => setAdding(false)} pending={pending} />
            {error && <p className="text-text-dim text-xs mt-2">{error}</p>}
          </div>
        )}
      </Glass>

      {goals.length === 0 ? (
        <Glass className="p-8 text-center text-text-dim text-sm">No savings goals yet.</Glass>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} accounts={accounts} />
          ))}
        </div>
      )}
    </div>
  );
}
