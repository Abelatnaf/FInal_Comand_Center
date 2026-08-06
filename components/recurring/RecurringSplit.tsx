"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ensureSplitTemplate,
  addTemplateShare,
  removeTemplateShare,
  deleteSplitTemplate,
} from "@/app/(app)/recurring/actions";
import { Amount } from "@/components/money/Amount";

export type TemplateShare = { id: string; person: string; share_bp: number };
export type SplitTemplate = { id: string; shares: TemplateShare[] };

/**
 * Splitting a recurring charge -- rent, utilities, the shared streaming bill.
 *
 * Shares are a percentage of the charge rather than a fixed amount, because a
 * utility bill moves every month and a fixed share would quietly stop matching
 * what the person actually owes. The IOUs themselves are created by the
 * database when the charge posts, not here, so a cron-posted copy and a
 * hand-posted one behave identically.
 */
export function RecurringSplit({
  entryId,
  amountMinor,
  template,
}: {
  entryId: string;
  amountMinor: number;
  template: SplitTemplate | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [person, setPerson] = useState("");
  const [percent, setPercent] = useState("");
  const router = useRouter();

  async function run(fn: () => Promise<{ error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return false;
    }
    router.refresh();
    return true;
  }

  if (!template) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="btn text-[14px] self-start"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const res = await ensureSplitTemplate(entryId);
              return { error: res.error };
            })
          }
        >
          Split it with someone
        </button>
        {error && <p className="text-alarm text-[13px]">{error}</p>}
      </div>
    );
  }

  const totalBp = template.shares.reduce((s, x) => s + x.share_bp, 0);
  const yours = BigInt(amountMinor) - BigInt(Math.round((amountMinor * totalBp) / 10000));

  return (
    <div className="flex flex-col gap-2 pt-3 mt-1 border-t">
      <p className="section-label">Split every time it posts</p>

      {template.shares.map((s) => (
        <div key={s.id} className="flex items-center gap-3 text-[14px]">
          <span className="flex-1 truncate">{s.person}</span>
          <span className="text-muted num">{(s.share_bp / 100).toFixed(s.share_bp % 100 ? 2 : 0)}%</span>
          <Amount minor={BigInt(Math.round((amountMinor * s.share_bp) / 10000))} className="text-muted" />
          <button
            type="button"
            className="text-alarm text-[13px]"
            disabled={busy}
            onClick={() => run(() => removeTemplateShare(s.id))}
          >
            Remove
          </button>
        </div>
      ))}

      {template.shares.length > 0 && (
        <p className="text-[13px] text-muted">
          Leaves you <Amount minor={yours} className="text-text" /> of it.
        </p>
      )}

      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Name"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          aria-label="Who owes you"
        />
        <input
          className="input num w-[92px]"
          inputMode="decimal"
          placeholder="%"
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          aria-label="Their share, as a percentage"
        />
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={async () => {
            const ok = await run(() => addTemplateShare(template.id, person, percent));
            if (ok) {
              setPerson("");
              setPercent("");
            }
          }}
        >
          Add
        </button>
      </div>

      {error && <p className="text-alarm text-[13px]">{error}</p>}

      <p className="text-[12px] text-faint">
        A share of the charge, so it follows the amount when the bill changes. What&rsquo;s owed shows up
        on Split once the charge posts.
      </p>

      <button
        type="button"
        className="text-muted text-[13px] self-start"
        disabled={busy}
        onClick={() => run(() => deleteSplitTemplate(template.id))}
      >
        Stop splitting this
      </button>
    </div>
  );
}
