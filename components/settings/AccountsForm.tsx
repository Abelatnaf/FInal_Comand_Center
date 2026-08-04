"use client";

import { useActionState, useState, useTransition } from "react";
import {
  addAccount,
  updateAccountBalance,
  toggleAccountArchived,
  deleteAccount,
  type ActionState,
} from "@/app/(app)/settings/actions";
import { fromMinor } from "@/lib/money";
import { AccountSwatch } from "@/components/money/AccountSwatch";

export const ACCOUNT_KINDS = [
  ["checking", "Checking"],
  ["savings", "Savings"],
  ["cash", "Cash"],
  ["credit", "Credit card"],
  ["meal_plan", "Meal plan"],
  ["investment", "Investment"],
  ["other", "Other"],
] as const;

const ACCOUNT_KIND_LABEL: Record<string, string> = Object.fromEntries(ACCOUNT_KINDS);

type Account = {
  id: string;
  name: string;
  kind: string;
  institution: string | null;
  opening_balance_minor: number;
  is_archived: boolean;
};

function AccountRow({ account, index }: { account: Account; index: number }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateAccountBalance, undefined);
  const [busy, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <div className="row flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <AccountSwatch name={account.name} index={index} />
          <div className="min-w-0">
            <p className="text-[15px] text-text truncate">
              {account.name} {account.is_archived && <span className="text-faint">(archived)</span>}
            </p>
            <p className="text-[13px] text-muted">
              {ACCOUNT_KIND_LABEL[account.kind] ?? account.kind}
              {account.institution ? ` · ${account.institution}` : ""}
            </p>
          </div>
        </div>
        <button type="button" className="text-muted text-[13px] shrink-0" onClick={() => setEditing((v) => !v)}>
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {editing ? (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={account.id} />
          <input
            name="name"
            defaultValue={account.name}
            className="input"
            aria-label="Account name"
            placeholder="Account name"
          />
          <input
            name="opening_balance"
            defaultValue={fromMinor(BigInt(account.opening_balance_minor))}
            className="input num"
            aria-label="Starting balance"
          />
          <input
            name="institution"
            defaultValue={account.institution ?? ""}
            className="input"
            aria-label="Bank or institution"
            placeholder="Bank or institution (optional)"
          />
          <select name="kind" defaultValue={account.kind} className="input" aria-label="Account type">
            {ACCOUNT_KINDS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="text-[12px] text-faint">
            A credit card&rsquo;s balance goes negative as you spend on it. Dining dollars use the
            &ldquo;Meal plan&rdquo; type and are kept out of your spendable-cash figure.
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn btn-primary flex-1">
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() =>
                startTransition(async () => {
                  const res = await toggleAccountArchived(account.id, !account.is_archived);
                  if (res.error) setActionError(res.error);
                })
              }
            >
              {account.is_archived ? "Unarchive" : "Archive"}
            </button>
            <button
              type="button"
              className="btn btn-destructive"
              disabled={busy}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteAccount(account.id);
                  if (res.error) setActionError(res.error);
                })
              }
            >
              Delete
            </button>
          </div>
        </form>
      ) : (
        <p className="text-[15px] num text-text">{fromMinor(BigInt(account.opening_balance_minor))} starting balance</p>
      )}
      {(state?.error || actionError) && <p className="text-alarm text-[13px]">{state?.error ?? actionError}</p>}
    </div>
  );
}

export function AccountsForm({ accounts }: { accounts: Account[] }) {
  const [addState, addFormAction, addPending] = useActionState<ActionState, FormData>(addAccount, undefined);

  return (
    <div className="card">
      <p className="section-label row pb-0">Accounts</p>
      {accounts.map((a, i) => (
        <AccountRow key={a.id} account={a} index={i} />
      ))}
      <form action={addFormAction} className="row flex flex-col gap-2">
        <input name="name" placeholder="Name" required className="input" />
        <div className="flex gap-2">
          <select name="kind" className="input" defaultValue="checking">
            {ACCOUNT_KINDS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input name="institution" placeholder="Bank (optional)" className="input" />
        </div>
        <input name="opening_balance" defaultValue="0" placeholder="Current balance" className="input num" />
        {addState?.error && <p className="text-alarm text-[13px]">{addState.error}</p>}
        <button type="submit" disabled={addPending} className="btn">
          {addPending ? "Adding…" : "Add account"}
        </button>
      </form>
    </div>
  );
}
