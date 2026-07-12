"use client";

import { useActionState } from "react";
import { Glass } from "@/components/glass/Glass";
import { updateSettings } from "@/app/(app)/settings/actions";
import { DatePicker } from "@/components/ui/DatePicker";

export type SettingsData = {
  fx_rate: number;
  tracking_start_date: string;
};

export function SettingsForm({ settings }: { settings: SettingsData }) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <Glass className="p-6 max-w-xl">
      <form action={formAction} className="flex flex-col gap-4">
        <div>
          <label className="stat-label block mb-1.5" htmlFor="fx_rate">
            FX Rate — Secondary Currency per 1 USD
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
          <p className="text-text-dim text-xs mt-1.5">
            Changing this only affects new transactions — past entries keep the rate they were logged at.
          </p>
        </div>

        <div>
          <label className="stat-label block mb-1.5" htmlFor="tracking_start_date">
            Start Date (Week 1)
          </label>
          <DatePicker
            id="tracking_start_date"
            name="tracking_start_date"
            defaultValue={settings.tracking_start_date}
            required
            className="w-full"
          />
          <p className="text-text-dim text-xs mt-1.5">
            The date your weekly rollup and week numbers count from.
          </p>
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
