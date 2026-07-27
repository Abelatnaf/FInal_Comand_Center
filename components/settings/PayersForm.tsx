"use client";

import { useActionState } from "react";
import { updatePayerLabel, type ActionState } from "@/app/(app)/settings/actions";

type Payer = { id: string; key: string; label: string; class_year: number | null };

function PayerRow({ payer }: { payer: Payer }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updatePayerLabel, undefined);

  return (
    <form action={formAction} className="row flex items-center gap-2">
      <input type="hidden" name="id" value={payer.id} />
      <div className="flex-1">
        <input name="label" defaultValue={payer.label} className="input" />
        {state?.error && <p className="text-alarm text-[13px] mt-1">{state.error}</p>}
      </div>
      <button type="submit" disabled={pending} className="btn">
        {pending ? "…" : "Save"}
      </button>
    </form>
  );
}

export function PayersForm({ payers }: { payers: Payer[] }) {
  return (
    <div className="card">
      <p className="section-label row pb-0">Payers</p>
      {payers.map((p) => (
        <PayerRow key={p.id} payer={p} />
      ))}
    </div>
  );
}
