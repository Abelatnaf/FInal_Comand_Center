"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { addTransaction, addIncome } from "@/app/(app)/quick-add-actions";
import { PAYMENT_METHODS, INCOME_SOURCES } from "@/lib/constants";

type Category = { id: number; name: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function QuickAddFab({
  categories,
  fxRate,
}: {
  categories: Category[];
  fxRate: number;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"transaction" | "income">("transaction");
  const [currency, setCurrency] = useState<"USD" | "ETB">("USD");
  const [amount, setAmount] = useState("");

  const [txState, txAction, txPending] = useActionState(addTransaction, undefined);
  const [incState, incAction, incPending] = useActionState(addIncome, undefined);

  const pending = mode === "transaction" ? txPending : incPending;
  const error = mode === "transaction" ? txState?.error : incState?.error;

  const usdPreview = useMemo(() => {
    const n = parseFloat(amount);
    if (!n || Number.isNaN(n)) return null;
    return currency === "USD" ? n : n / fxRate;
  }, [amount, currency, fxRate]);

  function close() {
    setOpen(false);
    setAmount("");
  }

  // Closing the modal here syncs local UI state with the server action's
  // result, which only exists after the async mutation resolves — not
  // something derivable during render.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (txState?.success) close();
  }, [txState]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (incState?.success) close();
  }, [incState]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick add transaction or income"
        className="fixed bottom-24 md:bottom-6 right-5 md:right-6 z-40 w-14 h-14 rounded-full bg-tint flex items-center justify-center shadow-[0_6px_20px_rgba(10,132,255,0.4)] active:opacity-80 transition-opacity"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-0 md:px-4"
          onClick={close}
        >
          <div
            className="material w-full max-w-md rounded-t-[16px] md:rounded-[16px] p-5 max-h-[88vh] overflow-y-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 rounded-full bg-[var(--gray2)] mx-auto mb-4 md:hidden" />

            <div className="segmented mb-5">
              <button type="button" data-active={mode === "transaction"} onClick={() => setMode("transaction")}>
                Expense
              </button>
              <button type="button" data-active={mode === "income"} onClick={() => setMode("income")}>
                Income
              </button>
            </div>

            <form key={mode} action={mode === "transaction" ? txAction : incAction} className="flex flex-col gap-3.5">
              <div className="flex gap-2.5">
                <div className="flex-1">
                  <label className="stat-label block mb-1.5">Amount</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input w-full num"
                    placeholder="0.00"
                  />
                </div>
                <div className="w-28">
                  <label className="stat-label block mb-1.5">Currency</label>
                  <select
                    name="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as "USD" | "ETB")}
                    className="select w-full"
                  >
                    <option value="USD">USD</option>
                    <option value="ETB">ETB</option>
                  </select>
                </div>
              </div>
              {currency === "ETB" && (
                <div className="stat-label num -mt-1.5">
                  {usdPreview !== null ? `≈ $${usdPreview.toFixed(2)} at ${fxRate} ETB/USD` : ""}
                </div>
              )}

              <div>
                <label className="stat-label block mb-1.5">Date</label>
                <input name="date" type="date" required defaultValue={todayIso()} className="input w-full" />
              </div>

              {mode === "transaction" ? (
                <>
                  <div>
                    <label className="stat-label block mb-1.5">Category</label>
                    <select name="category_id" required className="select w-full" defaultValue="">
                      <option value="" disabled>
                        Select category
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="stat-label block mb-1.5">Description</label>
                    <input name="description" type="text" className="input w-full" />
                  </div>

                  <div className="flex gap-2.5">
                    <div className="flex-1">
                      <label className="stat-label block mb-1.5">Necessity</label>
                      <select name="necessity" className="select w-full" defaultValue="Necessary">
                        <option value="Necessary">Necessary</option>
                        <option value="Discretionary">Discretionary</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="stat-label block mb-1.5">Payment</label>
                      <select name="payment_method" className="select w-full" defaultValue="SoFi Debit">
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center justify-between ios-body py-0.5">
                    <span>Recurring</span>
                    <input name="is_recurring" type="checkbox" className="ios-switch" />
                  </label>
                </>
              ) : (
                <div>
                  <label className="stat-label block mb-1.5">Source</label>
                  <input
                    name="source"
                    type="text"
                    list="income-sources"
                    className="input w-full"
                    placeholder="Family Support"
                  />
                  <datalist id="income-sources">
                    {INCOME_SOURCES.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              )}

              <div>
                <label className="stat-label block mb-1.5">Notes</label>
                <input name="notes" type="text" className="input w-full" />
              </div>

              {error && <p className="text-red text-[15px]">{error}</p>}

              <button disabled={pending} type="submit" className="btn btn-primary w-full !py-3 !text-[17px] mt-1">
                {pending ? "Saving…" : mode === "transaction" ? "Add Expense" : "Add Income"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
