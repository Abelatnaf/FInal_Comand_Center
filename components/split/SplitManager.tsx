"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSplit, settleShare, deleteShare, type SplitState } from "@/app/(app)/split/actions";
import { Amount } from "@/components/money/Amount";
import { formatShortDate } from "@/lib/date";
import { fromMinor } from "@/lib/money";

export type ShareRow = {
  id: string;
  person: string;
  amount_minor: number;
  settled_at: string | null;
  occurred_on: string;
  note: string | null;
  transaction_amount_minor: number;
};

type RecentExpense = { id: string; occurred_on: string; note: string | null; amount_minor: number };
type Account = { id: string; name: string };

export function SplitManager({
  shares,
  recentExpenses,
  accounts,
}: {
  shares: ShareRow[];
  recentExpenses: RecentExpense[];
  accounts: Account[];
}) {
  const [adding, setAdding] = useState(false);
  const [state, formAction, pending] = useActionState<SplitState, FormData>(addSplit, undefined);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setAdding(false);
  }, [state]);

  const open = shares.filter((s) => !s.settled_at);
  const settled = shares.filter((s) => s.settled_at);

  const byPerson = new Map<string, bigint>();
  for (const s of open) {
    byPerson.set(s.person, (byPerson.get(s.person) ?? 0n) + BigInt(s.amount_minor));
  }
  const total = [...byPerson.values()].reduce((a, b) => a + b, 0n);

  return (
    <div className="flex flex-col gap-5">
      {total > 0n && (
        <div className="card card-hero row">
          <p className="section-label mb-2">Owed to you</p>
          <Amount minor={total} className="hero-figure block text-positive" />
          <p className="text-[14px] text-muted mt-1">
            across {byPerson.size} {byPerson.size === 1 ? "person" : "people"}
          </p>
        </div>
      )}

      <div className="card">
        <div className="row flex items-center justify-between gap-3">
          <div>
            <p className="section-label mb-1">Split an expense</p>
            <p className="text-[13px] text-muted">
              You paid the whole thing, so it stays recorded in full. This just tracks the part someone
              owes you back.
            </p>
          </div>
          {!adding && (
            <button type="button" className="text-accent text-[13px] shrink-0" onClick={() => setAdding(true)}>
              Add
            </button>
          )}
        </div>

        {adding && (
          <form action={formAction} className="row flex flex-col gap-2">
            {recentExpenses.length === 0 ? (
              <p className="text-[14px] text-muted">Log an expense first, then split it here.</p>
            ) : (
              <>
                <select name="transaction_id" className="input" aria-label="Which expense" required>
                  {recentExpenses.map((e) => (
                    <option key={e.id} value={e.id}>
                      {formatShortDate(e.occurred_on)} · {e.note?.trim() || "Expense"} · $
                      {fromMinor(BigInt(e.amount_minor))}
                    </option>
                  ))}
                </select>
                <input name="person" placeholder="Who owes you? e.g. Sam" className="input" required />
                <input
                  name="amount"
                  inputMode="decimal"
                  placeholder="Their share, e.g. 12.50"
                  className="input num"
                  required
                />
                {state?.error && <p className="text-alarm text-[13px]">{state.error}</p>}
                <div className="flex gap-2">
                  <button type="button" className="btn flex-1" onClick={() => setAdding(false)}>
                    Cancel
                  </button>
                  <button type="submit" disabled={pending} className="btn btn-primary flex-1">
                    {pending ? "Saving…" : "Save"}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>

      {open.length > 0 && (
        <div className="card">
          <div className="row pb-0 flex items-center justify-between">
            <p className="section-label">Waiting on</p>
            {accounts.length > 1 && (
              <select
                className="input w-auto text-[13px] py-1"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                aria-label="Settle into which account"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    into {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          {open.map((s) => (
            <div key={s.id} className="row flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] text-text truncate">{s.person}</p>
                <p className="text-[13px] text-muted truncate">
                  {s.note?.trim() || "Expense"} · {formatShortDate(s.occurred_on)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Amount minor={BigInt(s.amount_minor)} className="text-positive" />
                <button
                  type="button"
                  className="btn text-[13px] py-1.5 px-3"
                  disabled={busy}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await settleShare(s.id, accountId);
                      if (res.error) setError(res.error);
                      router.refresh();
                    })
                  }
                >
                  Paid
                </button>
                <button
                  type="button"
                  className="text-alarm text-[13px]"
                  disabled={busy}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteShare(s.id);
                      router.refresh();
                    })
                  }
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          <p className="row text-[12px] text-faint">
            Marking one paid logs it as money coming in, so your balance stays right.
          </p>
          {error && <p className="row text-alarm text-[13px]">{error}</p>}
        </div>
      )}

      {open.length === 0 && total === 0n && (
        <div className="card row">
          <p className="text-[14px] text-muted">Nobody owes you anything right now.</p>
        </div>
      )}

      {settled.length > 0 && (
        <details className="card">
          <summary className="row cursor-pointer list-none text-[15px] font-semibold">
            Settled ({settled.length})
          </summary>
          {settled.slice(0, 20).map((s) => (
            <div key={s.id} className="row flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] text-muted truncate">{s.person}</p>
                <p className="text-[13px] text-faint truncate">
                  {s.note?.trim() || "Expense"} · {formatShortDate(s.occurred_on)}
                </p>
              </div>
              <Amount minor={BigInt(s.amount_minor)} className="text-faint shrink-0" />
            </div>
          ))}
        </details>
      )}
    </div>
  );
}
