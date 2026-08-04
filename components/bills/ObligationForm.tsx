"use client";

import { useActionState } from "react";
import { createObligation, updateObligation, type ActionState } from "@/app/(app)/bills/actions";
import { fromMinor } from "@/lib/money";

export function ObligationForm({
  mode,
  initial,
}: {
  mode: "new" | "edit";
  initial?: {
    id: string;
    title: string;
    due_on: string | null;
    amount_usd_minor: number;
    source_note: string | null;
  };
}) {
  const action = mode === "new" ? createObligation : updateObligation;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="card row flex flex-col gap-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <div>
        <label className="section-label block mb-1.5" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          defaultValue={initial?.title}
          placeholder="Car insurance renewal"
          className="input"
        />
      </div>
      <div>
        <label className="section-label block mb-1.5" htmlFor="due_on">
          Due date
        </label>
        <input id="due_on" name="due_on" type="date" defaultValue={initial?.due_on ?? ""} className="input" />
      </div>
      <div>
        <label className="section-label block mb-1.5" htmlFor="amount">
          Amount (USD)
        </label>
        <input
          id="amount"
          name="amount"
          required
          defaultValue={initial ? fromMinor(BigInt(initial.amount_usd_minor)) : undefined}
          placeholder="0.00"
          className="input num"
        />
      </div>
      <div>
        <label className="section-label block mb-1.5" htmlFor="source_note">
          Where this number came from
        </label>
        <input
          id="source_note"
          name="source_note"
          defaultValue={initial?.source_note ?? ""}
          placeholder="e.g. billing statement, Aug 1"
          className="input"
        />
      </div>
      {state?.error && <p className="text-alarm text-[14px]">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Saving…" : mode === "new" ? "Add bill" : "Save"}
      </button>
    </form>
  );
}
