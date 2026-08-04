"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTerm,
  updateTerm,
  setTermArchived,
  deleteTerm,
  type TermState,
} from "@/app/(app)/semesters/actions";
import { formatShortDate, todayIso } from "@/lib/date";
import { formatMoney, fromMinor } from "@/lib/money";

export type TermRow = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  is_archived: boolean;
  target_end_balance_minor: number;
};

/** Rough US academic calendar, so the common case is two taps not eight. */
function suggestTerm(): { name: string; starts_on: string; ends_on: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // Aug-Dec reads as Fall; Jan-May as Spring; Jun-Jul as Summer.
  if (month >= 7 && month <= 11) {
    return { name: `Fall ${year}`, starts_on: `${year}-08-25`, ends_on: `${year}-12-15` };
  }
  if (month <= 4) {
    return { name: `Spring ${year}`, starts_on: `${year}-01-15`, ends_on: `${year}-05-10` };
  }
  return { name: `Summer ${year}`, starts_on: `${year}-06-01`, ends_on: `${year}-08-15` };
}

export function TermsManager({ terms }: { terms: TermRow[] }) {
  const suggestion = suggestTerm();
  const [adding, setAdding] = useState(terms.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<TermState, FormData>(createTerm, undefined);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state?.success) setAdding(false);
  }, [state]);

  const today = todayIso();

  return (
    <div className="flex flex-col gap-5">
      <div className="card">
        <div className="row flex items-center justify-between gap-3">
          <div>
            <p className="section-label mb-1">Your terms</p>
            <p className="text-[13px] text-muted">
              The dates your money has to stretch across. The home screen counts down to the end of
              whichever one you&rsquo;re in.
            </p>
          </div>
          {!adding && (
            <button type="button" className="text-accent text-[13px] shrink-0" onClick={() => setAdding(true)}>
              Add
            </button>
          )}
        </div>

        {terms.length === 0 && !adding && (
          <p className="row text-[14px] text-muted">No terms yet.</p>
        )}

        {terms.map((t) => {
          const isCurrent = t.starts_on <= today && t.ends_on >= today && !t.is_archived;
          if (editingId === t.id) {
            return <TermEditRow key={t.id} term={t} onDone={() => setEditingId(null)} />;
          }
          return (
            <div key={t.id} className="row flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] text-text truncate">
                  {t.name}{" "}
                  {isCurrent && <span className="status-pill" data-status="open">Now</span>}
                  {t.is_archived && <span className="text-faint">(archived)</span>}
                </p>
                <p className="text-[13px] text-muted">
                  {formatShortDate(t.starts_on)} – {formatShortDate(t.ends_on)}
                  {t.target_end_balance_minor > 0 &&
                    ` · keep ${formatMoney(BigInt(t.target_end_balance_minor))}`}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button type="button" className="text-accent text-[13px]" onClick={() => setEditingId(t.id)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="text-muted text-[13px]"
                  disabled={busy}
                  onClick={() =>
                    startTransition(async () => {
                      await setTermArchived(t.id, !t.is_archived);
                      router.refresh();
                    })
                  }
                >
                  {t.is_archived ? "Unarchive" : "Archive"}
                </button>
                <button
                  type="button"
                  className="text-alarm text-[13px]"
                  disabled={busy}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await deleteTerm(t.id);
                      if (res.error) setError(res.error);
                      router.refresh();
                    })
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}

        {adding && (
          <form action={formAction} className="row flex flex-col gap-2">
            <input
              name="name"
              defaultValue={suggestion.name}
              placeholder="Fall 2026"
              className="input"
              aria-label="Term name"
              required
            />
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="section-label block mb-1">Starts</span>
                <input
                  name="starts_on"
                  type="date"
                  defaultValue={suggestion.starts_on}
                  className="input"
                  required
                />
              </label>
              <label className="flex-1">
                <span className="section-label block mb-1">Ends</span>
                <input
                  name="ends_on"
                  type="date"
                  defaultValue={suggestion.ends_on}
                  className="input"
                  required
                />
              </label>
            </div>
            <p className="text-[12px] text-faint">
              Dates are pre-filled with a typical semester — change them to match your school&rsquo;s
              calendar.
            </p>
            <label>
              <span className="section-label block mb-1">Leave yourself, by the end</span>
              <input
                name="target_end_balance"
                inputMode="decimal"
                placeholder="0"
                className="input num"
              />
              <span className="text-[12px] text-faint block mt-1">
                Optional. Set this and the daily safe-to-spend figure stops pacing you to exactly $0 on
                the last day.
              </span>
            </label>
            {state?.error && <p className="text-alarm text-[13px]">{state.error}</p>}
            <div className="flex gap-2">
              {terms.length > 0 && (
                <button type="button" className="btn flex-1" onClick={() => setAdding(false)}>
                  Cancel
                </button>
              )}
              <button type="submit" disabled={pending} className="btn btn-primary flex-1">
                {pending ? "Saving…" : "Save term"}
              </button>
            </div>
          </form>
        )}

        {error && <p className="row text-alarm text-[13px]">{error}</p>}
      </div>
    </div>
  );
}

function TermEditRow({ term, onDone }: { term: TermRow; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<TermState, FormData>(updateTerm, undefined);

  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="row flex flex-col gap-2">
      <input type="hidden" name="id" value={term.id} />
      <input name="name" defaultValue={term.name} className="input" aria-label="Term name" required />
      <div className="flex gap-2">
        <input name="starts_on" type="date" defaultValue={term.starts_on} className="input" aria-label="Starts" />
        <input name="ends_on" type="date" defaultValue={term.ends_on} className="input" aria-label="Ends" />
      </div>
      <label>
        <span className="section-label block mb-1">Leave yourself, by the end</span>
        <input
          name="target_end_balance"
          inputMode="decimal"
          defaultValue={
            term.target_end_balance_minor
              ? fromMinor(BigInt(term.target_end_balance_minor))
              : ""
          }
          placeholder="0"
          className="input num"
        />
      </label>
      {state?.error && <p className="text-alarm text-[13px]">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn flex-1" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className="btn btn-primary flex-1">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
