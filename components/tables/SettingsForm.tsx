"use client";

import { useActionState } from "react";
import { Glass } from "@/components/glass/Glass";
import { updateSettings } from "@/app/(app)/settings/actions";

export type SettingsData = {
  fx_rate: number;
  matriculation_date: string;
  starting_sofi: number;
  starting_ally: number;
  starting_cash: number;
};

export function SettingsForm({ settings }: { settings: SettingsData }) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <Glass className="p-6 max-w-xl">
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label className="stat-label block mb-1.5" htmlFor="fx_rate">
            FX Rate — ETB per 1 USD
          </label>
          <input
            id="fx_rate"
            name="fx_rate"
            type="number"
            step="0.01"
            min="0"
            defaultValue={settings.fx_rate}
            required
            className="input w-full num"
          />
          <p className="text-text-faint text-xs mt-1.5">
            Changing this only affects new transactions — past entries keep the rate they were logged at.
          </p>
        </div>

        <div>
          <label className="stat-label block mb-1.5" htmlFor="matriculation_date">
            Matriculation Date (Cadet Week 1 start)
          </label>
          <input
            id="matriculation_date"
            name="matriculation_date"
            type="date"
            defaultValue={settings.matriculation_date}
            required
            className="input w-full"
          />
        </div>

        <div className="stat-label mt-2">Starting Balances (USD)</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-text-faint text-xs block mb-1.5" htmlFor="starting_sofi">
              SoFi
            </label>
            <input
              id="starting_sofi"
              name="starting_sofi"
              type="number"
              step="0.01"
              defaultValue={settings.starting_sofi}
              className="input w-full num"
            />
          </div>
          <div>
            <label className="text-text-faint text-xs block mb-1.5" htmlFor="starting_ally">
              Ally
            </label>
            <input
              id="starting_ally"
              name="starting_ally"
              type="number"
              step="0.01"
              defaultValue={settings.starting_ally}
              className="input w-full num"
            />
          </div>
          <div>
            <label className="text-text-faint text-xs block mb-1.5" htmlFor="starting_cash">
              Cash
            </label>
            <input
              id="starting_cash"
              name="starting_cash"
              type="number"
              step="0.01"
              defaultValue={settings.starting_cash}
              className="input w-full num"
            />
          </div>
        </div>

        {state?.error && <p className="text-text-dim text-sm">{state.error}</p>}
        {state?.success && <p className="text-text-dim text-sm">Saved.</p>}

        <button disabled={pending} type="submit" className="btn btn-primary mt-2">
          {pending ? "Saving…" : "Save Settings"}
        </button>
      </form>
    </Glass>
  );
}
