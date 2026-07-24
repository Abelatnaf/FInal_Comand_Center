"use client";

import { useState } from "react";
import { Glass } from "@/components/glass/Glass";
import { DatePicker } from "@/components/ui/DatePicker";
import { fmtMoney, fmtDate } from "@/lib/format";
import { addGoal, updateGoal, deleteGoal } from "@/app/(app)/goals/actions";

type Account = { id: string; name: string };
type Goal = {
  id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  account_id: string | null;
  account_name: string | null;
  saved: number;
};

function GoalForm({
  goal,
  accounts,
  onSubmit,
  onCancel,
}: {
  goal?: Goal;
  accounts: Account[];
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
}) {
  const [accountId, setAccountId] = useState(goal?.account_id ?? "");
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? "");

  return (
    <form
      action={(formData) => {
        onSubmit(formData);
      }}
      className="flex flex-col gap-2.5"
    >
      <input name="name" defaultValue={goal?.name} required placeholder="Goal name" className="input w-full text-sm !py-2 !px-3" />
      <div className="grid grid-cols-2 gap-2.5">
        <input
          name="targetAmount"
          type="number"
          step="1"
          min="1"
          defaultValue={goal?.target_amount}
          required
          placeholder="Target amount"
          className="input text-sm !py-2 !px-3"
        />
        <DatePicker name="targetDate" value={targetDate} onChange={setTargetDate} placeholder="Target date" className="text-sm !py-2 !px-3" />
      </div>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)} name="accountId" className="select text-sm !py-2 !px-3 w-full">
        <option value="">Track manually</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            Track via {a.name}
          </option>
        ))}
      </select>
      {!accountId && (
        <input
          name="savedSoFar"
          type="number"
          step="1"
          min="0"
          defaultValue={goal?.saved}
          placeholder="Saved so far"
          className="input text-sm !py-2 !px-3 w-full"
        />
      )}
      <div className="flex gap-3 justify-end pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="link-action text-[13px]">
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary text-[13px] !py-1.5 !px-3">
          Save
        </button>
      </div>
    </form>
  );
}

function GoalCard({
  goal,
  accounts,
  currency,
  secondaryCurrency = null,
  fxRate = null,
}: {
  goal: Goal;
  accounts: Account[];
  currency: string;
  secondaryCurrency?: string | null;
  fxRate?: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pct = goal.target_amount > 0 ? Math.min(100, (goal.saved / goal.target_amount) * 100) : 0;
  const showSecondary = Boolean(secondaryCurrency && fxRate);
  const secondarySaved = showSecondary ? fmtMoney(goal.saved * fxRate!, secondaryCurrency!) : null;
  const secondaryTarget = showSecondary ? fmtMoney(goal.target_amount * fxRate!, secondaryCurrency!) : null;

  if (editing) {
    return (
      <Glass className="p-5">
        <GoalForm
          goal={goal}
          accounts={accounts}
          onSubmit={async (formData) => {
            await updateGoal(goal.id, formData);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </Glass>
    );
  }

  return (
    <Glass className="p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="ios-headline truncate">{goal.name}</div>
          {goal.account_name && <div className="ios-footnote text-text-dim">🔗 Tracking {goal.account_name}</div>}
          {goal.target_date && <div className="ios-footnote text-text-dim">By {fmtDate(goal.target_date)}</div>}
        </div>
        <div className="flex gap-2.5 shrink-0">
          <button onClick={() => setEditing(true)} className="link-action text-[13px]">
            Edit
          </button>
          {confirmDelete ? (
            <button onClick={() => deleteGoal(goal.id)} className="link-destructive text-[13px]">
              Confirm?
            </button>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="link-destructive text-[13px]">
              Delete
            </button>
          )}
        </div>
      </div>
      <div className="liquid-track mb-2">
        <div className="liquid-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-baseline justify-between">
        <div className="num ios-headline">{fmtMoney(goal.saved, currency)}</div>
        <div className="ios-footnote text-text-dim">of {fmtMoney(goal.target_amount, currency)}</div>
      </div>
      {secondarySaved && (
        <div className="flex items-baseline justify-between">
          <div className="ios-caption text-text-faint num">≈ {secondarySaved}</div>
          <div className="ios-caption text-text-faint">of {secondaryTarget}</div>
        </div>
      )}
    </Glass>
  );
}

export function GoalsList({
  goals,
  accounts,
  currency,
  secondaryCurrency = null,
  fxRate = null,
}: {
  goals: Goal[];
  accounts: Account[];
  currency: string;
  secondaryCurrency?: string | null;
  fxRate?: number | null;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} accounts={accounts} currency={currency} secondaryCurrency={secondaryCurrency} fxRate={fxRate} />
      ))}

      {adding ? (
        <Glass className="p-5">
          <GoalForm
            accounts={accounts}
            onSubmit={async (formData) => {
              await addGoal(formData);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </Glass>
      ) : (
        <button onClick={() => setAdding(true)} className="btn w-full !py-3">
          + Add a Goal
        </button>
      )}
    </div>
  );
}
