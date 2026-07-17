"use client";

import { useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";
import { saveReconciliation, closeMonth, reopenMonth } from "@/app/(app)/close/actions";

type AccountRow = {
  id: string;
  name: string;
  kind: string;
  computedBalance: number | null;
  statementBalance: number | null;
  reconciled: boolean;
};

type RowState = { statementBalance: string; reconciled: boolean };

export function CloseMonthPanel({
  month,
  status,
  closedAt,
  reopenReason,
  accounts,
}: {
  month: string;
  status: string;
  closedAt: string | null;
  reopenReason: string | null;
  accounts: AccountRow[];
}) {
  const [rows, setRows] = useState<Record<string, RowState>>(
    Object.fromEntries(
      accounts.map((a) => [a.id, { statementBalance: a.statementBalance != null ? String(a.statementBalance) : "", reconciled: a.reconciled }])
    )
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenText, setReopenText] = useState("");
  const [pending, startTransition] = useTransition();

  const isClosed = status === "closed";
  const allReconciled = accounts.length > 0 && accounts.every((a) => rows[a.id]?.reconciled);

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function buildPayload() {
    return accounts.map((a) => ({
      accountId: a.id,
      statementBalance: rows[a.id]?.statementBalance.trim() ? Number(rows[a.id].statementBalance) : null,
      computedBalance: a.computedBalance,
      reconciled: rows[a.id]?.reconciled ?? false,
    }));
  }

  function handleSave() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await saveReconciliation(month, buildPayload());
      if (res?.error) setError(res.error);
      else setNotice("Progress saved.");
    });
  }

  function handleClose() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const saveRes = await saveReconciliation(month, buildPayload());
      if (saveRes?.error) {
        setError(saveRes.error);
        return;
      }
      const res = await closeMonth(month);
      if (res?.error) setError(res.error);
      else setNotice("Month closed.");
    });
  }

  function handleReopen() {
    setError(null);
    startTransition(async () => {
      const res = await reopenMonth(month, reopenText);
      if (res?.error) setError(res.error);
      else {
        setNotice("Month reopened.");
        setReopenOpen(false);
        setReopenText("");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Glass className={`p-4 flex items-center justify-between gap-4 ${isClosed ? "border border-[var(--green)]/30" : ""}`}>
        <div>
          <div className="ios-subhead text-text font-medium">
            {isClosed ? `Closed${closedAt ? ` — ${new Date(closedAt).toLocaleDateString()}` : ""}` : "Reconciling"}
          </div>
          {reopenReason && (
            <div className="ios-footnote text-text-dim mt-0.5">Last reopened: &ldquo;{reopenReason}&rdquo;</div>
          )}
        </div>
        {isClosed ? (
          reopenOpen ? (
            <div className="flex items-center gap-2">
              <input
                value={reopenText}
                onChange={(e) => setReopenText(e.target.value)}
                placeholder="Why reopen this month?"
                className="input !py-1.5 !px-2 text-sm w-56"
              />
              <button onClick={handleReopen} disabled={pending || !reopenText.trim()} className="btn text-sm">
                Confirm Reopen
              </button>
              <button onClick={() => setReopenOpen(false)} className="btn text-sm">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setReopenOpen(true)} className="link-destructive text-sm">
              Reopen Month
            </button>
          )
        ) : (
          <span className="stat-label">Unlocked — edits allowed</span>
        )}
      </Glass>

      <Glass className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-dim text-left text-xs border-b border-[var(--separator)]">
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Computed (as of month end)</th>
              <th className="px-4 py-3 font-medium">Statement Balance</th>
              <th className="px-4 py-3 font-medium">Difference</th>
              <th className="px-4 py-3 font-medium text-center">Reconciled</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a, i) => {
              const row = rows[a.id];
              const statementNum = row?.statementBalance.trim() ? Number(row.statementBalance) : null;
              const diff = a.computedBalance != null && statementNum != null ? statementNum - a.computedBalance : null;
              return (
                <tr key={a.id} className={i > 0 ? "border-t border-[var(--separator)]" : ""}>
                  <td className="px-4 py-3">
                    <div className="text-text">{a.name}</div>
                    {a.kind === "liability" && <div className="stat-label mt-0.5">Liability — statement only</div>}
                  </td>
                  <td className="px-4 py-3 num text-text-dim">
                    {a.computedBalance != null ? fmtUsd(a.computedBalance) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={row?.statementBalance ?? ""}
                      onChange={(e) => updateRow(a.id, { statementBalance: e.target.value })}
                      disabled={isClosed}
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="input !py-1.5 !px-2 text-sm num w-32"
                    />
                  </td>
                  <td className="px-4 py-3 num">
                    {diff != null ? (
                      <span className={Math.abs(diff) < 0.01 ? "text-text-dim" : "text-[var(--red)]"}>{fmtUsd(diff)}</span>
                    ) : (
                      <span className="text-text-dim">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="ios-switch"
                      checked={row?.reconciled ?? false}
                      disabled={isClosed}
                      onChange={(e) => updateRow(a.id, { reconciled: e.target.checked })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Glass>

      {error && <p className="text-[var(--red)] text-[13px]">{error}</p>}
      {notice && !error && <p className="text-text-dim text-[13px]">{notice}</p>}

      {!isClosed && (
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={pending} className="btn text-sm">
            {pending ? "Saving…" : "Save Progress"}
          </button>
          <button onClick={handleClose} disabled={pending || !allReconciled} className="btn btn-primary text-sm">
            {pending ? "Closing…" : "Close Month"}
          </button>
          {!allReconciled && accounts.length > 0 && (
            <span className="ios-footnote text-text-dim self-center">Mark every account reconciled to close.</span>
          )}
        </div>
      )}
    </div>
  );
}
