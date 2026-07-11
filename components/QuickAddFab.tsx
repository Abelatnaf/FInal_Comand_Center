"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { addTransaction, addIncome } from "@/app/(app)/quick-add-actions";

type Category = { id: number; name: string };

const PAYMENT_METHODS = [
  "SoFi Debit",
  "Ally",
  "Payoneer",
  "Cash",
  "VMI Cadet Store Charge",
  "Other",
];

const INCOME_SOURCES = ["Family Support", "Cadet Pay/Stipend", "SoFi/Ally Drawdown"];

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
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full btn-primary text-2xl leading-none flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 px-4 pb-4 md:pb-0"
          onClick={close}
        >
          <div
            className="glass w-full max-w-sm p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2 mb-5">
              <button
                type="button"
                onClick={() => setMode("transaction")}
                className={`btn flex-1 !py-2 ${mode === "transaction" ? "btn-primary" : ""}`}
              >
                Transaction
              </button>
              <button
                type="button"
                onClick={() => setMode("income")}
                className={`btn flex-1 !py-2 ${mode === "income" ? "btn-primary" : ""}`}
              >
                Income
              </button>
            </div>

            <form
              key={mode}
              action={mode === "transaction" ? txAction : incAction}
              className="flex flex-col gap-3"
            >
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="stat-label block mb-1.5 text-xs">Amount</label>
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
                  <label className="stat-label block mb-1.5 text-xs">Currency</label>
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
                <div className="text-text-faint text-xs num -mt-1">
                  {usdPreview !== null ? `≈ $${usdPreview.toFixed(2)} at ${fxRate} ETB/USD` : ""}
                </div>
              )}

              <div>
                <label className="stat-label block mb-1.5 text-xs">Date</label>
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={todayIso()}
                  className="input w-full"
                />
              </div>

              {mode === "transaction" ? (
                <>
                  <div>
                    <label className="stat-label block mb-1.5 text-xs">Category</label>
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
                    <label className="stat-label block mb-1.5 text-xs">Description</label>
                    <input name="description" type="text" className="input w-full" />
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="stat-label block mb-1.5 text-xs">Necessity</label>
                      <select
                        name="necessity"
                        className="select w-full"
                        defaultValue="Necessary"
                      >
                        <option value="Necessary">Necessary</option>
                        <option value="Discretionary">Discretionary</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="stat-label block mb-1.5 text-xs">Payment</label>
                      <select
                        name="payment_method"
                        className="select w-full"
                        defaultValue="SoFi Debit"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-text-dim">
                    <input name="is_recurring" type="checkbox" className="accent-silver" />
                    Recurring
                  </label>
                </>
              ) : (
                <div>
                  <label className="stat-label block mb-1.5 text-xs">Source</label>
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
                <label className="stat-label block mb-1.5 text-xs">Notes</label>
                <input name="notes" type="text" className="input w-full" />
              </div>

              {error && <p className="text-text-dim text-sm">{error}</p>}

              <button disabled={pending} type="submit" className="btn btn-primary mt-2">
                {pending ? "Saving…" : `Save ${mode === "transaction" ? "transaction" : "income"}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
