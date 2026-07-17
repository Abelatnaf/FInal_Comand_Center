"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { addTransaction, addIncome, addTransfer, lookupMerchantMemory, getLastEntry } from "@/app/(app)/quick-add-actions";
import { PAYMENT_METHODS, INCOME_SOURCES } from "@/lib/constants";
import { DatePicker } from "@/components/ui/DatePicker";

type Category = { id: number; name: string };
type Account = { id: string; name: string };
type Currency = { code: string; name: string; rate_to_usd: number };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const LAST_CURRENCY_KEY = "quickadd_last_currency";

type SplitRow = { id: number; categoryId: string; amount: string };

export function QuickAddFab({
  categories,
  currencies,
  accounts,
}: {
  categories: Category[];
  currencies: Currency[];
  accounts: Account[];
}) {
  const allCurrencies = useMemo<Currency[]>(
    () => [{ code: "USD", name: "US Dollar", rate_to_usd: 1 }, ...currencies],
    [currencies]
  );
  const hasExtraCurrencies = currencies.length > 0;
  const soleAccountId = accounts.length === 1 ? accounts[0].id : "";

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"transaction" | "income" | "transfer">("transaction");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState(soleAccountId);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [necessity, setNecessity] = useState("Necessary");
  const [necessityTouched, setNecessityTouched] = useState(false);
  const [autofillNote, setAutofillNote] = useState<string | null>(null);
  const [repeatPending, setRepeatPending] = useState(false);
  const [splitOn, setSplitOn] = useState(false);
  const [splits, setSplits] = useState<SplitRow[]>([
    { id: 1, categoryId: "", amount: "" },
    { id: 2, categoryId: "", amount: "" },
  ]);
  const [txState, txAction, txPending] = useActionState(addTransaction, undefined);
  const [incState, incAction, incPending] = useActionState(addIncome, undefined);
  const [transferState, transferAction, transferPending] = useActionState(addTransfer, undefined);

  const pending = mode === "transaction" ? txPending : mode === "income" ? incPending : transferPending;
  const error = mode === "transaction" ? txState?.error : mode === "income" ? incState?.error : transferState?.error;
  const duplicateWarning = mode === "transaction" ? txState?.duplicateWarning : mode === "income" ? incState?.duplicateWarning : undefined;

  const selectedRate = allCurrencies.find((c) => c.code === currency)?.rate_to_usd ?? 1;

  const usdPreview = useMemo(() => {
    const n = parseFloat(amount);
    if (!n || Number.isNaN(n)) return null;
    return currency === "USD" ? n : n / selectedRate;
  }, [amount, currency, selectedRate]);

  const splitTotal = splits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const splitTarget = usdPreview ?? (parseFloat(amount) || 0);
  const splitMismatch = splitOn && Math.abs(splitTotal - splitTarget) > 0.01;

  // Restore the last currency the user actually used, so routine entries in
  // a non-USD currency don't require re-picking it every single time.
  useEffect(() => {
    const saved = localStorage.getItem(LAST_CURRENCY_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved && (saved === "USD" || currencies.some((c) => c.code === saved))) setCurrency(saved);
  }, [currencies]);

  function resetForm() {
    setAmount("");
    setDescription("");
    setSource("");
    setCategoryId("");
    setAccountId(soleAccountId);
    setPaymentMethod("");
    setNecessity("Necessary");
    setNecessityTouched(false);
    setAutofillNote(null);
    setSplitOn(false);
    setSplits([
      { id: 1, categoryId: "", amount: "" },
      { id: 2, categoryId: "", amount: "" },
    ]);
  }

  function close() {
    setOpen(false);
    resetForm();
  }

  // Closing the modal here syncs local UI state with the server action's
  // result, which only exists after the async mutation resolves — not
  // something derivable during render.
  useEffect(() => {
    if (txState?.success) {
      localStorage.setItem(LAST_CURRENCY_KEY, currency);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txState]);

  useEffect(() => {
    if (incState?.success) {
      localStorage.setItem(LAST_CURRENCY_KEY, currency);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incState]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (transferState?.success) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferState]);

  // Merchant memory: once the user has typed enough of a description/source
  // to identify it, look up the most recent matching entry and prefill
  // whatever fields they haven't already set themselves.
  useEffect(() => {
    if (!open || mode === "transfer") return;
    const text = mode === "transaction" ? description : source;
    if (text.trim().length < 2) return;
    const handle = setTimeout(async () => {
      const match = await lookupMerchantMemory(mode, text);
      if (!match) return;
      let filled = false;
      if (mode === "transaction") {
        if (!categoryId && match.category_id != null) {
          setCategoryId(String(match.category_id));
          filled = true;
        }
        if (!accountId && match.account_id) {
          setAccountId(match.account_id);
          filled = true;
        }
        if (!paymentMethod && match.payment_method) {
          setPaymentMethod(match.payment_method);
          filled = true;
        }
        if (!necessityTouched && match.necessity) {
          setNecessity(match.necessity);
          filled = true;
        }
      } else if (!accountId && match.account_id) {
        setAccountId(match.account_id);
        filled = true;
      }
      if (filled) setAutofillNote(`Filled in from your last "${text.trim()}" entry.`);
    }, 450);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, source, mode, open]);

  async function handleRepeatLast() {
    setRepeatPending(true);
    const last = await getLastEntry(mode === "income" ? "income" : "transaction");
    setRepeatPending(false);
    if (!last) return;
    setAmount(String(last.amount_original));
    setCurrency(last.currency);
    setAccountId(last.account_id ?? soleAccountId);
    if (mode === "transaction") {
      setCategoryId(last.category_id != null ? String(last.category_id) : "");
      setPaymentMethod(last.payment_method ?? "");
      setNecessity(last.necessity ?? "Necessary");
      setNecessityTouched(true);
      setDescription(last.description ?? "");
    } else {
      setSource(last.source ?? "");
    }
    setAutofillNote("Filled in from your last entry — check the date before saving.");
  }

  function addSplitRow() {
    setSplits((rows) => [...rows, { id: Date.now(), categoryId: "", amount: "" }]);
  }
  function removeSplitRow(id: number) {
    setSplits((rows) => (rows.length > 2 ? rows.filter((r) => r.id !== id) : rows));
  }
  function updateSplitRow(id: number, patch: Partial<SplitRow>) {
    setSplits((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function handleTxSubmit(formData: FormData) {
    if (duplicateWarning) formData.set("confirm_duplicate", "true");
    if (splitOn && !splitMismatch) {
      const rows = splits
        .filter((r) => r.categoryId && parseFloat(r.amount) > 0)
        .map((r) => ({ category_id: Number(r.categoryId), amount_usd: parseFloat(r.amount) }));
      if (rows.length > 1) formData.set("splits", JSON.stringify(rows));
    }
    txAction(formData);
  }

  function handleIncomeSubmit(formData: FormData) {
    if (duplicateWarning) formData.set("confirm_duplicate", "true");
    incAction(formData);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick add transaction, income, or transfer"
        className="fixed bottom-24 md:bottom-6 right-5 md:right-6 z-40 w-14 h-14 rounded-full bg-tint flex items-center justify-center shadow-[0_6px_20px_rgba(10,132,255,0.4)] active:opacity-80 active:scale-90 transition-[opacity,transform] duration-150"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-0 md:px-4 anim-backdrop"
          onClick={close}
        >
          <div
            className="material w-full max-w-md rounded-t-[16px] md:rounded-[16px] p-5 max-h-[88vh] overflow-y-auto anim-sheet"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 rounded-full bg-[var(--gray2)] mx-auto mb-4 md:hidden" />

            <div className="flex items-center justify-between gap-3 mb-3.5">
              <div className="segmented flex-1">
                <button type="button" data-active={mode === "transaction"} onClick={() => setMode("transaction")}>
                  Expense
                </button>
                <button type="button" data-active={mode === "income"} onClick={() => setMode("income")}>
                  Income
                </button>
                <button type="button" data-active={mode === "transfer"} onClick={() => setMode("transfer")}>
                  Transfer
                </button>
              </div>
              {mode !== "transfer" && (
                <button
                  type="button"
                  onClick={handleRepeatLast}
                  disabled={repeatPending}
                  className="link-action text-[13px] whitespace-nowrap shrink-0"
                >
                  {repeatPending ? "Loading…" : "↻ Repeat last"}
                </button>
              )}
            </div>

            {mode === "transfer" ? (
              <form key="transfer" action={transferAction} className="flex flex-col gap-3.5">
                <p className="text-text-dim text-[12px] -mt-1">
                  Moving money between your own accounts — a transfer never counts as income or spending.
                </p>
                <div>
                  <label className="stat-label block mb-1.5">Amount (USD)</label>
                  <input name="amount" type="number" step="0.01" min="0.01" required autoFocus className="input w-full num" placeholder="0.00" />
                </div>
                <div>
                  <label className="stat-label block mb-1.5">Date</label>
                  <DatePicker name="date" required defaultValue={todayIso()} className="w-full" />
                </div>
                <div className="flex gap-2.5">
                  <div className="flex-1">
                    <label className="stat-label block mb-1.5">From</label>
                    <select name="from_account_id" required className="select w-full" defaultValue="">
                      <option value="" disabled>Select</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="stat-label block mb-1.5">To</label>
                    <select name="to_account_id" required className="select w-full" defaultValue="">
                      <option value="" disabled>Select</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="stat-label block mb-1.5">Notes</label>
                  <input name="notes" type="text" className="input w-full" />
                </div>

                {accounts.length < 2 && (
                  <p className="text-text-dim text-[13px]">You need at least two accounts (Settings → Financial) to log a transfer.</p>
                )}
                {error && <p className="text-red text-[15px]">{error}</p>}

                <button disabled={pending || accounts.length < 2} type="submit" className="btn btn-primary w-full !py-3 !text-[17px] mt-1">
                  {pending ? "Saving…" : "Add Transfer"}
                </button>
              </form>
            ) : (
              <form
                key={mode}
                action={mode === "transaction" ? handleTxSubmit : handleIncomeSubmit}
                className="flex flex-col gap-3.5"
              >
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
                  {hasExtraCurrencies ? (
                    <div className="w-28">
                      <label className="stat-label block mb-1.5">Currency</label>
                      <select
                        name="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="select w-full"
                      >
                        {allCurrencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <input type="hidden" name="currency" value="USD" />
                  )}
                </div>
                {hasExtraCurrencies && currency !== "USD" && (
                  <div className="stat-label num -mt-1.5">
                    {usdPreview !== null ? `≈ $${usdPreview.toFixed(2)} at ${selectedRate} ${currency}/USD` : ""}
                  </div>
                )}

                <div>
                  <label className="stat-label block mb-1.5">Date</label>
                  <DatePicker name="date" required defaultValue={todayIso()} className="w-full" />
                </div>

                {accounts.length > 1 && (
                  <div>
                    <label className="stat-label block mb-1.5">Account (optional)</label>
                    <select
                      name="account_id"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="select w-full"
                    >
                      <option value="">No account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {accounts.length <= 1 && <input type="hidden" name="account_id" value={accountId} />}

                {mode === "transaction" ? (
                  <>
                    {!splitOn && (
                      <div>
                        <label className="stat-label block mb-1.5">Category</label>
                        <select
                          name="category_id"
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          required
                          className="select w-full"
                        >
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
                    )}

                    <label className="flex items-center justify-between ios-body py-0.5">
                      <span>Split into categories</span>
                      <input
                        type="checkbox"
                        className="ios-switch"
                        checked={splitOn}
                        onChange={(e) => setSplitOn(e.target.checked)}
                      />
                    </label>
                    <p className="text-text-dim text-[12px] -mt-2.5">One purchase, multiple budget categories — e.g. a Target run that&apos;s part groceries, part household.</p>

                    {splitOn && (
                      <div className="flex flex-col gap-2 rounded-[12px] p-3" style={{ background: "var(--fill-quaternary)" }}>
                        {/* Fallback category so the DB insert still has a value; hidden from the user while splitting. */}
                        <input type="hidden" name="category_id" value={splits.find((r) => r.categoryId)?.categoryId ?? categoryId ?? categories[0]?.id ?? ""} />
                        {splits.map((row, i) => (
                          <div key={row.id} className="flex gap-2 items-end">
                            <div className="flex-1">
                              {i === 0 && <label className="stat-label block mb-1 text-[11px]">Category</label>}
                              <select
                                value={row.categoryId}
                                onChange={(e) => updateSplitRow(row.id, { categoryId: e.target.value })}
                                className="select w-full !py-1.5 !px-2 text-sm"
                              >
                                <option value="">Select</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="w-24">
                              {i === 0 && <label className="stat-label block mb-1 text-[11px]">Amount</label>}
                              <input
                                type="number"
                                step="0.01"
                                value={row.amount}
                                onChange={(e) => updateSplitRow(row.id, { amount: e.target.value })}
                                className="input w-full !py-1.5 !px-2 text-sm num"
                                placeholder="0.00"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSplitRow(row.id)}
                              disabled={splits.length <= 2}
                              className="link-destructive text-[13px] pb-1.5 disabled:opacity-30"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={addSplitRow} className="link-action text-[13px] self-start">
                          + Add category
                        </button>
                        <div className={`text-[12px] num ${splitMismatch ? "text-red" : "text-text-dim"}`}>
                          {splitTarget > 0
                            ? `Split total: $${splitTotal.toFixed(2)} of $${splitTarget.toFixed(2)}${splitMismatch ? " — must match the amount above" : " ✓"}`
                            : "Enter the amount above first."}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="stat-label block mb-1.5">Description</label>
                      <input
                        name="description"
                        type="text"
                        value={description}
                        onChange={(e) => {
                          setDescription(e.target.value);
                          setAutofillNote(null);
                        }}
                        className="input w-full"
                      />
                      {autofillNote && <p className="text-text-dim text-[12px] mt-1.5">✨ {autofillNote}</p>}
                    </div>

                    <div className="flex gap-2.5">
                      <div className="flex-1">
                        <label className="stat-label block mb-1.5">Necessity</label>
                        <select
                          name="necessity"
                          value={necessity}
                          onChange={(e) => {
                            setNecessity(e.target.value);
                            setNecessityTouched(true);
                          }}
                          className="select w-full"
                        >
                          <option value="Necessary">Necessary</option>
                          <option value="Discretionary">Discretionary</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="stat-label block mb-1.5">Payment</label>
                        <input
                          name="payment_method"
                          type="text"
                          list="payment-methods"
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="input w-full"
                          placeholder="Debit Card"
                        />
                        <datalist id="payment-methods">
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <label className="flex items-center justify-between ios-body py-0.5">
                      <span>Recurring</span>
                      <input name="is_recurring" type="checkbox" className="ios-switch" />
                    </label>

                    <label className="flex items-center justify-between ios-body py-0.5">
                      <span>Tax deductible</span>
                      <input name="is_tax_deductible" type="checkbox" className="ios-switch" />
                    </label>

                    <div>
                      <label className="stat-label block mb-1.5">Receipt (optional)</label>
                      <input name="receipt" type="file" accept="image/*,application/pdf" className="input w-full !py-1.5 text-sm" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="stat-label block mb-1.5">Source</label>
                    <input
                      name="source"
                      type="text"
                      list="income-sources"
                      value={source}
                      onChange={(e) => {
                        setSource(e.target.value);
                        setAutofillNote(null);
                      }}
                      className="input w-full"
                      placeholder="Family Support"
                    />
                    <datalist id="income-sources">
                      {INCOME_SOURCES.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                    {autofillNote && <p className="text-text-dim text-[12px] mt-1.5">✨ {autofillNote}</p>}
                  </div>
                )}

                <div>
                  <label className="stat-label block mb-1.5">Notes</label>
                  <input name="notes" type="text" className="input w-full" />
                </div>

                {duplicateWarning && (
                  <div className="rounded-[10px] p-3 text-[13px]" style={{ background: "rgba(255,159,10,0.14)", color: "var(--label)" }}>
                    ⚠ {duplicateWarning} Submit again to add it anyway.
                  </div>
                )}
                {error && <p className="text-red text-[15px]">{error}</p>}

                <button
                  disabled={pending || (splitOn && splitMismatch)}
                  type="submit"
                  className="btn btn-primary w-full !py-3 !text-[17px] mt-1"
                >
                  {pending ? "Saving…" : duplicateWarning ? "Add Anyway" : mode === "transaction" ? "Add Expense" : "Add Income"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
