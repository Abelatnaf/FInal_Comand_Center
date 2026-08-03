"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { updatePayerLabel, addPayer, deletePayer, type ActionState } from "@/app/(app)/settings/actions";

type Payer = { id: string; key: string; label: string; class_year: number | null };

function PayerRow({ payer, canDelete }: { payer: Payer; canDelete: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updatePayerLabel, undefined);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="row flex flex-col gap-2">
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={payer.id} />
        <input name="label" defaultValue={payer.label} className="input flex-1" aria-label="Payer name" />
        <button type="submit" disabled={pending} className="btn">
          {pending ? "…" : "Save"}
        </button>
      </form>

      {canDelete && (
        <button
          type="button"
          className="text-alarm text-[13px] self-start"
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              const res = await deletePayer(payer.id);
              setError(res.error ?? null);
            })
          }
        >
          Delete
        </button>
      )}

      {state?.error && <p className="text-alarm text-[13px]">{state.error}</p>}
      {error && <p className="text-alarm text-[13px]">{error}</p>}
    </div>
  );
}

export function PayersForm({ payers }: { payers: Payer[] }) {
  const [adding, setAdding] = useState(false);
  const [addState, addAction, addPending] = useActionState<ActionState, FormData>(addPayer, undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (addState?.success) setAdding(false);
  }, [addState]);

  return (
    <div className="card">
      <div className="row pb-0 flex items-center justify-between gap-3">
        <p className="section-label">Payers</p>
        {!adding && (
          <button type="button" className="text-accent text-[13px]" onClick={() => setAdding(true)}>
            Add
          </button>
        )}
      </div>

      {payers.map((p) => (
        // Keeping at least one payer is a real constraint, not a nicety: every
        // transaction and bill requires one, so deleting the last would make
        // the app unusable until another was created.
        <PayerRow key={p.id} payer={p} canDelete={payers.length > 1} />
      ))}

      {adding && (
        <form action={addAction} className="row flex flex-col gap-2">
          <input name="label" placeholder="Who's paying?" required className="input" aria-label="New payer name" />
          {addState?.error && <p className="text-alarm text-[13px]">{addState.error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn flex-1" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" disabled={addPending} className="btn btn-primary flex-1">
              {addPending ? "Adding…" : "Add payer"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
