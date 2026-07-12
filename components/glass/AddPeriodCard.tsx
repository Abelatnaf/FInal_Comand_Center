"use client";

import { useState, useTransition } from "react";
import { Glass } from "./Glass";
import { DatePicker } from "@/components/ui/DatePicker";
import { addPeriod } from "@/app/(app)/semester-planner/actions";

export function AddPeriodCard() {
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const res = await addPeriod(formData);
      if (res?.error) setError(res.error);
      else {
        setError(null);
        setAdding(false);
      }
    });
  }

  if (!adding) {
    return (
      <Glass className="p-7 flex items-center justify-center">
        <button onClick={() => setAdding(true)} className="btn">
          + Add Budget Period
        </button>
      </Glass>
    );
  }

  return (
    <Glass className="p-7">
      <div className="ios-headline mb-4">New Budget Period</div>
      <form action={handleAdd} className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[140px]">
          <label className="stat-label block mb-1 text-[10px]">Name</label>
          <input name="name" required placeholder="e.g. Q1 2027" className="input !py-1.5 !px-2 text-sm w-full" />
        </div>
        <div className="w-36">
          <label className="stat-label block mb-1 text-[10px]">Start</label>
          <DatePicker name="start_date" required className="!py-1.5 !px-2 text-sm" />
        </div>
        <div className="w-36">
          <label className="stat-label block mb-1 text-[10px]">End</label>
          <DatePicker name="end_date" required className="!py-1.5 !px-2 text-sm" />
        </div>
        <div className="flex gap-1.5">
          <button type="submit" disabled={pending} className="btn btn-primary !py-1.5 !px-3 text-xs">
            {pending ? "Adding…" : "Add"}
          </button>
          <button type="button" onClick={() => setAdding(false)} className="btn !py-1.5 !px-3 text-xs">
            Cancel
          </button>
        </div>
      </form>
      {error && <p className="text-text-dim text-xs mt-2">{error}</p>}
    </Glass>
  );
}
