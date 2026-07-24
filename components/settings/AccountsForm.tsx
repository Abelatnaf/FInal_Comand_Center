"use client";

import { useState } from "react";
import { addAccount, updateAccount, deleteAccount } from "@/app/(app)/settings/actions";
import { fmtMoney, fmtSecondary } from "@/lib/format";

type Account = { id: string; name: string; kind: string; starting_balance: number };

function AccountForm({
  account,
  onSubmit,
  onCancel,
}: {
  account?: Account;
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
}) {
  return (
    <form action={onSubmit} className="flex flex-col gap-2.5">
      <input name="name" defaultValue={account?.name} required placeholder="Account name" className="input text-sm !py-2 !px-3 w-full" />
      <div className="grid grid-cols-2 gap-2.5">
        <select name="kind" defaultValue={account?.kind ?? "asset"} className="select text-sm !py-2 !px-3">
          <option value="asset">Asset</option>
          <option value="liability">Liability</option>
        </select>
        <input
          name="startingBalance"
          type="number"
          step="0.01"
          defaultValue={account?.starting_balance ?? 0}
          placeholder="Starting balance"
          className="input text-sm !py-2 !px-3"
        />
      </div>
      <div className="flex gap-3 justify-end">
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

export function AccountsForm({
  accounts,
  currency,
  secondaryCurrency = null,
  fxRate = null,
}: {
  accounts: Account[];
  currency: string;
  secondaryCurrency?: string | null;
  fxRate?: number | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col">
      {accounts.map((a, i) =>
        editingId === a.id ? (
          <div key={a.id} className={`py-3 ${i > 0 ? "border-t border-[var(--separator)]" : ""}`}>
            <AccountForm
              account={a}
              onSubmit={async (formData) => {
                await updateAccount(a.id, formData);
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          </div>
        ) : (
          <div key={a.id} className={`flex items-center justify-between py-2.5 gap-2 ${i > 0 ? "border-t border-[var(--separator)]" : ""}`}>
            <div>
              <div className="ios-body">
                {a.name}
                {a.kind === "liability" && <span className="ios-caption text-text-faint ml-1.5">(liability)</span>}
              </div>
              <div className="ios-footnote text-text-dim num">Starting balance: {fmtMoney(a.starting_balance, currency)}</div>
              {fmtSecondary(a.starting_balance, secondaryCurrency, fxRate) && (
                <div className="ios-caption text-text-faint num">{fmtSecondary(a.starting_balance, secondaryCurrency, fxRate)}</div>
              )}
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => setEditingId(a.id)} className="link-action text-[13px]">
                Edit
              </button>
              <button onClick={() => deleteAccount(a.id)} className="link-destructive text-[13px]">
                Delete
              </button>
            </div>
          </div>
        )
      )}

      {adding ? (
        <div className={`py-3 ${accounts.length > 0 ? "border-t border-[var(--separator)]" : ""}`}>
          <AccountForm
            onSubmit={async (formData) => {
              await addAccount(formData);
              setAdding(false);
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="link-action text-[13px] text-left py-2">
          + Add account
        </button>
      )}
    </div>
  );
}
