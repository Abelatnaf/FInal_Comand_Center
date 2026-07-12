"use client";

import { useActionState, useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { addCurrency, deleteCurrency, updateCurrencyRates } from "@/app/(app)/settings/actions";

export type Currency = { id: string; code: string; name: string; rate_to_usd: number };

export function CurrenciesForm({ currencies }: { currencies: Currency[] }) {
  const [state, formAction, pending] = useActionState(updateCurrencyRates, undefined);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(currencies.map((c) => [c.id, String(c.rate_to_usd)]))
  );
  const [adding, setAdding] = useState(false);
  const [addPending, startAddTransition] = useTransition();
  const [addError, setAddError] = useState<string | null>(null);

  function handleAdd(formData: FormData) {
    startAddTransition(async () => {
      const res = await addCurrency(formData);
      if (res?.error) setAddError(res.error);
      else {
        setAddError(null);
        setAdding(false);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this currency? You can still view past transactions logged in it, but you won't be able to add new ones until you add it back.")) return;
    startAddTransition(async () => {
      await deleteCurrency(id);
    });
  }

  return (
    <Glass className="p-6 max-w-xl">
      <div className="flex items-center justify-between mb-1">
        <div className="ios-headline">Currencies</div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="btn text-xs">
            + Add Currency
          </button>
        )}
      </div>
      <p className="text-text-dim ios-subhead mb-4">
        USD is always available at a 1:1 rate. Add any other currency you spend or earn in, with its rate per 1 USD — Quick Add
        and the transaction tables convert to USD using the rate that was active when each entry was logged.
      </p>

      {adding && (
        <form action={handleAdd} className="flex flex-wrap gap-2 items-end mb-4">
          <div className="w-24">
            <label className="stat-label block mb-1 text-[10px]">Code</label>
            <input name="code" required maxLength={8} placeholder="EUR" className="input !py-1.5 !px-2 text-sm w-full uppercase" />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="stat-label block mb-1 text-[10px]">Name</label>
            <input name="name" required placeholder="Euro" className="input !py-1.5 !px-2 text-sm w-full" />
          </div>
          <div className="w-32">
            <label className="stat-label block mb-1 text-[10px]">Rate per 1 USD</label>
            <input name="rate_to_usd" type="number" step="0.0001" min="0.0001" required className="input !py-1.5 !px-2 text-sm num w-full" />
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
        <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--separator)]">
          <span className="ios-body">USD</span>
          <span className="text-text-dim num text-sm">Base currency — 1.00</span>
        </div>
        {currencies.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--separator)]">
            <label htmlFor={`cur_${c.id}`} className="ios-body">
              {c.code} <span className="text-text-dim">— {c.name}</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 w-32">
                <input
                  id={`cur_${c.id}`}
                  name={`currency_${c.id}`}
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={values[c.id]}
                  onChange={(e) => setValues((v) => ({ ...v, [c.id]: e.target.value }))}
                  className="input !py-1.5 !px-2 text-sm num w-full text-right"
                />
                <span className="text-text-dim text-xs">/ USD</span>
              </div>
              <button type="button" onClick={() => handleDelete(c.id)} className="link-destructive text-[13px]">
                Delete
              </button>
            </div>
          </div>
        ))}

        {currencies.length === 0 && (
          <div className="text-text-dim text-sm py-3">No other currencies yet — add one above if you spend or earn in more than USD.</div>
        )}

        {state?.error && <p className="text-text-dim text-sm mt-2">{state.error}</p>}
        {state?.success && <p className="text-text-dim text-sm mt-2">Saved.</p>}

        {currencies.length > 0 && (
          <button disabled={pending} type="submit" className="btn btn-primary mt-4 self-start">
            {pending ? "Saving…" : "Save Rates"}
          </button>
        )}
      </form>
    </Glass>
  );
}
