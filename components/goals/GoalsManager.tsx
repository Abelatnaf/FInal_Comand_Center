"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSavingsGoal, deleteSavingsGoal, updateGoalSaved } from "@/app/(app)/goals/actions";
import { Amount } from "@/components/money/Amount";
import { formatMoney, fromMinor } from "@/lib/money";
import { formatShortDate } from "@/lib/date";

export type GoalItem = {
  id: string;
  name: string;
  target_minor: number;
  saved_minor: number;
  remaining_minor: number;
  target_date: string | null;
  days_until_target: number | null;
  account_id: string | null;
  account_name: string | null;
};

type Account = { id: string; name: string };

export function GoalsManager({ goals, accounts }: { goals: GoalItem[]; accounts: Account[] }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    const res = await createSavingsGoal(new FormData(form));
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    form.reset();
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <p className="text-alarm text-[14px]">{error}</p>}

      {!adding ? (
        <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
          Add a goal
        </button>
      ) : (
        <form onSubmit={handleCreate} className="card">
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="g-name">
              What are you saving for
            </label>
            <input id="g-name" name="name" className="input" placeholder="New laptop" required />
          </div>
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="g-target">
              Target amount
            </label>
            <div className="flex gap-2">
              <input
                id="g-target"
                name="target"
                className="input num flex-1"
                inputMode="decimal"
                placeholder="1200"
                required
              />
            </div>
          </div>
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="g-date">
              Target date (optional)
            </label>
            <input id="g-date" name="target_date" type="date" className="input" />
          </div>
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="g-account">
              Track an account
            </label>
            <select id="g-account" name="account_id" className="input" defaultValue="">
              <option value="">Track manually</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-faint mt-1.5">
              Link an account and progress follows its real balance. Otherwise you enter what you&rsquo;ve put
              aside yourself.
            </p>
          </div>
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="g-saved">
              Saved so far (manual goals only)
            </label>
            <input id="g-saved" name="saved_manual" className="input num" inputMode="decimal" placeholder="0" />
          </div>
          <div className="row flex gap-2">
            <button type="button" className="btn flex-1" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {goals.length === 0 && (
        <div className="card row">
          <p className="text-[14px] text-muted">
            No goals yet. Set one and you&rsquo;ll see how close you are, and how much a month it takes to get
            there on time.
          </p>
        </div>
      )}

      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  );
}

function GoalCard({ goal }: { goal: GoalItem }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(fromMinor(BigInt(goal.saved_minor)));
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const saved = BigInt(goal.saved_minor);
  const target = BigInt(goal.target_minor);
  const remaining = BigInt(goal.remaining_minor);
  const percent = target > 0n ? Number((saved * 100n) / target) : 0;
  const done = remaining === 0n;

  // Only claim a monthly figure while the date is still ahead — dividing by a
  // past or zero month count would produce a meaningless number.
  const monthsLeft =
    goal.days_until_target != null && goal.days_until_target > 0
      ? Math.max(1, Math.round(goal.days_until_target / 30))
      : null;
  const perMonth = monthsLeft && remaining > 0n ? remaining / BigInt(monthsLeft) : null;

  async function save() {
    setBusy(true);
    await updateGoalSaved(goal.id, value);
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    await deleteSavingsGoal(goal.id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card row flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[16px] font-semibold truncate">{goal.name}</p>
          <p className="text-[13px] text-muted">
            {goal.account_name ? `Tracking ${goal.account_name}` : "Tracked manually"}
            {goal.target_date && ` · by ${formatShortDate(goal.target_date)}`}
          </p>
        </div>
        {done && <span className="status-pill" data-status="paid">Reached</span>}
      </div>

      <div className="flex items-baseline justify-between text-[15px]">
        <Amount minor={saved} className="font-semibold" />
        <span className="text-muted num text-[13px]">of {formatMoney(target)}</span>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          data-tone={done ? "positive" : undefined}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      <p className="text-[13px] text-muted">
        {done ? (
          "You're there."
        ) : (
          <>
            <Amount minor={remaining} /> to go
            {perMonth != null && (
              <>
                {" · "}
                <Amount minor={perMonth} />/month to make it
              </>
            )}
            {goal.days_until_target != null && goal.days_until_target <= 0 && (
              <span className="text-urgent"> · target date has passed</span>
            )}
          </>
        )}
      </p>

      {editing ? (
        <div className="flex gap-2 pt-1">
          <input
            className="input flex-1 num"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={`Saved so far for ${goal.name}`}
          />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
            Save
          </button>
          <button type="button" className="btn" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-2 pt-1">
          {!goal.account_id && (
            <button type="button" className="btn text-[14px]" onClick={() => setEditing(true)}>
              Update saved
            </button>
          )}
          <button type="button" className="btn btn-destructive text-[14px]" disabled={busy} onClick={remove}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
