"use client";

import { useActionState, useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";
import { updateAccountBalances, addAccount, deleteAccount } from "@/app/(app)/settings/actions";

type Account = { id: string; name: string; starting_balance: number; kind: string; interest_rate_pct: number | null };

export function AccountsForm({ accounts }: { accounts: Account[] }) {
  const [state, formAction, pending] = useActionState(updateAccountBalances, undefined);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(accounts.map((a) => [a.id, String(a.starting_balance)]))
  );
  const [rates, setRates] = useState<Record<string, string>>(
    Object.fromEntries(accounts.map((a) => [a.id, a.interest_rate_pct != null ? String(a.interest_rate_pct) : ""]))
  );
  const [adding, setAdding] = useState(false);
  const [addPending, startAddTransition] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);

  const total = accounts.reduce((s, a) => {
    const v = parseFloat(values[a.id]) || 0;
    return s + (a.kind === "liability" ? -v : v);
  }, 0);

  function handleAdd(formData: FormData) {
    startAddTransition(async () => {
      const res = await addAccount(formData);
      if (res?.error) setAddError(res.error);
      else {
        setAddError(null);
        setAdding(false);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this account? Its history stays on past net worth snapshots.")) return;
    startAddTransition(async () => {
      await deleteAccount(id);
    });
  }

  return (
    <Glass className="p-6 max-w-xl">
      <div className="flex items-center justify-between mb-1">
        <div className="ios-headline">Accounts</div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="btn text-xs">
            + Add Account
          </button>
        )}
      </div>
      <p className="text-text-dim ios-subhead mb-4">
        Your own accounts. Assets (checking, savings, cash) add to your net worth; liabilities (credit cards, loans) subtract from it.
      </p>

      {adding && (
        <form action={handleAdd} className="flex flex-wrap gap-2 items-end mb-4">
          <div className="flex-1 min-w-[140px]">
            <label className="stat-label block mb-1 text-[10px]">Name</label>
            <input name="name" required placeholder="e.g. Checking" className="input !py-1.5 !px-2 text-sm w-full" />
          </div>
          <div>
            <label className="stat-label block mb-1 text-[10px]">Type</label>
            <select name="kind" defaultValue="asset" className="select !py-1.5 !px-2 text-sm">
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
            </select>
          </div>
          <div className="w-28">
            <label className="stat-label block mb-1 text-[10px]">Starting $</label>
            <input name="starting_balance" type="number" step="0.01" defaultValue={0} className="input !py-1.5 !px-2 text-sm num" />
          </div>
          <div className="flex gap-1.5">
            <button type="submit" disabled={addPending} className="btn btn-primary !py-1.5 !px-3 text-xs">
              {addPending ? "Adding…" : "Add"}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="btn !py-1.5 !px-3 text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}
      {addError && <p className="text-text-dim text-xs mb-3">{addError}</p>}

      <form action={formAction} className="flex flex-col">
        {accounts.map((a, i) => (
          <div
            key={a.id}
            className={`flex items-center justify-between gap-3 py-2.5 flex-wrap ${i > 0 ? "border-t border-[var(--separator)]" : ""}`}
          >
            <label htmlFor={`acct_${a.id}`} className="ios-body flex items-center gap-2">
              {a.name}
              {a.kind === "liability" && <span className="badge badge-dim !text-[10px] !py-0.5">Liability</span>}
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 w-32">
                <span className="text-text-dim">$</span>
                <input
                  id={`acct_${a.id}`}
                  name={`account_${a.id}`}
                  type="number"
                  step="0.01"
                  value={values[a.id]}
                  onChange={(e) => setValues((v) => ({ ...v, [a.id]: e.target.value }))}
                  className="input !py-1.5 !px-2 text-sm num w-full text-right"
                />
              </div>
              {a.kind === "liability" && (
                <div className="flex items-center gap-1 w-24">
                  <input
                    name={`rate_${a.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="APR"
                    value={rates[a.id]}
                    onChange={(e) => setRates((v) => ({ ...v, [a.id]: e.target.value }))}
                    className="input !py-1.5 !px-2 text-sm num w-full text-right"
                  />
                  <span className="text-text-dim text-xs">%</span>
                </div>
              )}
              <button type="button" onClick={() => handleDelete(a.id)} className="link-destructive text-[13px]">
                Delete
              </button>
            </div>
          </div>
        ))}

        {accounts.length === 0 ? (
          <div className="text-text-dim text-sm py-3">No accounts yet — add one above.</div>
        ) : (
          <div className="flex items-center justify-between border-t border-[var(--separator-strong)] pt-3 mt-1">
            <span className="ios-headline">Net Starting Balance</span>
            <span className="num ios-headline">{fmtUsd(total)}</span>
          </div>
        )}

        {state?.error && <p className="text-text-dim text-sm mt-2">{state.error}</p>}
        {state?.success && <p className="text-text-dim text-sm mt-2">Saved.</p>}

        <button disabled={pending || accounts.length === 0} type="submit" className="btn btn-primary mt-4 self-start">
          {pending ? "Saving…" : "Save Balances"}
        </button>
      </form>
    </Glass>
  );
}
