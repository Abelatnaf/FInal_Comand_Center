"use client";

import { useActionState } from "react";
import { Glass } from "@/components/glass/Glass";
import { updateSettings } from "@/app/(app)/settings/actions";
import { DatePicker } from "@/components/ui/DatePicker";

export type SettingsData = {
  tracking_start_date: string;
  low_balance_threshold: number | null;
};

export function SettingsForm({ settings }: { settings: SettingsData }) {
  const [state, formAction, pending] = useActionState(updateSettings, undefined);

  return (
    <Glass className="p-6 max-w-xl">
      <form action={formAction} className="flex flex-col gap-4">
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

        <div>
          <label className="stat-label block mb-1.5" htmlFor="low_balance_threshold">
            Low Balance Alert (optional)
          </label>
          <input
            id="low_balance_threshold"
            name="low_balance_threshold"
            type="number"
            step="0.01"
            min="0"
            defaultValue={settings.low_balance_threshold ?? ""}
            placeholder="e.g. 200"
            className="input w-full num"
          />
          <p className="text-text-dim text-xs mt-1.5">
            Get a banner when your current balance drops below this amount. Leave blank to turn it off.
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
