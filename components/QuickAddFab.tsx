"use client";

import { useActionState, useState } from "react";
import { addEntry, type AddEntryState } from "@/app/(app)/quick-add-actions";
import { DatePicker } from "@/components/ui/DatePicker";

type Category = { id: string; name: string };
type Account = { id: string; name: string };

const TYPES = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
] as const;

function todayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function QuickAddFab({ categories, accounts }: { categories: Category[]; accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"expense" | "income" | "transfer">("expense");
  const [date, setDate] = useState(todayIso());
  const [state, action, pending] = useActionState<AddEntryState, FormData>(async (prev, formData) => {
    const result = await addEntry(prev, formData);
    if (!result?.error) {
      setOpen(false);
      setDate(todayIso());
    }
    return result;
  }, undefined);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-5 z-40 bottom-24 md:bottom-8 w-14 h-14 rounded-full bg-[var(--blue)] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(0,122,255,0.4)] transition-transform active:scale-90"
        aria-label="Add entry"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 anim-backdrop" />
          <div
            className="relative material rounded-t-[20px] md:rounded-[20px] w-full md:w-[440px] p-5 shadow-[0_-8px_40px_rgba(0,0,0,0.2)] max-h-[88vh] overflow-y-auto anim-sheet"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-9 h-1 rounded-full bg-[var(--gray3)] mx-auto mb-4 md:hidden" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="ios-title3">Add Entry</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-text-dim">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <form action={action} className="flex flex-col gap-3.5">
              <input type="hidden" name="type" value={type} />
              <div className="segmented">
                {TYPES.map((t) => (
                  <div key={t.value} data-active={type === t.value} onClick={() => setType(t.value)}>
                    {t.label}
                  </div>
                ))}
              </div>

              <div>
                <label className="stat-label block mb-1.5">Date</label>
                <DatePicker value={date} onChange={setDate} />
                <input type="hidden" name="date" value={date} />
              </div>

              <div>
                <label className="stat-label block mb-1.5" htmlFor="qa-amount">
                  Amount
                </label>
                <input id="qa-amount" name="amount" type="number" step="0.01" min="0.01" required inputMode="decimal" className="input w-full" placeholder="0.00" />
              </div>

              <div>
                <label className="stat-label block mb-1.5" htmlFor="qa-description">
                  Description
                </label>
                <input
                  id="qa-description"
                  name="description"
                  required
                  className="input w-full"
                  placeholder={type === "income" ? "e.g. Paycheck" : type === "transfer" ? "e.g. Move to savings" : "e.g. Groceries"}
                />
              </div>

              {type === "transfer" ? (
                <>
                  <div>
                    <label className="stat-label block mb-1.5" htmlFor="qa-from">
                      From account
                    </label>
                    <select id="qa-from" name="accountId" required className="select w-full">
                      <option value="">Choose account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="stat-label block mb-1.5" htmlFor="qa-to">
                      To account
                    </label>
                    <select id="qa-to" name="toAccountId" required className="select w-full">
                      <option value="">Choose account</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="ios-footnote text-text-faint -mt-1">
                    Moving money between your own accounts — a transfer never counts as income or spending.
                  </p>
                </>
              ) : (
                <div>
                  <label className="stat-label block mb-1.5" htmlFor="qa-account">
                    Account
                  </label>
                  <select id="qa-account" name="accountId" className="select w-full">
                    <option value="">No account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {type === "expense" && (
                <div>
                  <label className="stat-label block mb-1.5" htmlFor="qa-category">
                    Category
                  </label>
                  <select id="qa-category" name="categoryId" className="select w-full">
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {type !== "transfer" && (
                <label className="flex items-center justify-between py-1">
                  <span className="ios-body">Repeats every month</span>
                  <input type="checkbox" name="isRecurring" className="ios-switch" />
                </label>
              )}

              <div>
                <label className="stat-label block mb-1.5" htmlFor="qa-notes">
                  Notes (optional)
                </label>
                <input id="qa-notes" name="notes" className="input w-full" />
              </div>

              {state?.error && <p className="text-red text-[15px]">{state.error}</p>}

              <button disabled={pending} type="submit" className="btn btn-primary w-full !py-3 !text-[17px] mt-1">
                {pending ? "Saving…" : "Save"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
