"use client";

import { useActionState, useState, useTransition } from "react";
import { createShareLink, revokeShareLink, deleteShareLink, type ActionState } from "@/app/(app)/settings/actions";
import { formatShortDate } from "@/lib/date";

type ShareLink = { id: string; label: string | null; created_at: string; revoked_at: string | null };

function ShareLinkRow({ link }: { link: ShareLink }) {
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/share/${link.id}` : `/share/${link.id}`;

  return (
    <div className="row flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] text-text truncate">{link.label || "Share link"}</p>
          <p className="text-[13px] text-muted">
            Created {formatShortDate(link.created_at.slice(0, 10))}
            {link.revoked_at && <span className="text-alarm"> · revoked</span>}
          </p>
        </div>
      </div>
      {!link.revoked_at && (
        <div className="flex items-center gap-2">
          <code className="text-[12px] text-muted truncate flex-1">{url}</code>
          <button
            type="button"
            className="text-text text-[13px] shrink-0"
            onClick={() => {
              navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <div className="flex gap-2">
        {!link.revoked_at && (
          <button
            type="button"
            className="btn flex-1"
            disabled={busy}
            onClick={() =>
              startTransition(async () => {
                const res = await revokeShareLink(link.id);
                if (res.error) setError(res.error);
              })
            }
          >
            Revoke
          </button>
        )}
        <button
          type="button"
          className="btn btn-destructive flex-1"
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteShareLink(link.id);
              if (res.error) setError(res.error);
            })
          }
        >
          Delete
        </button>
      </div>
      {error && <p className="text-alarm text-[13px]">{error}</p>}
    </div>
  );
}

export function ShareLinksForm({ links }: { links: ShareLink[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createShareLink, undefined);

  return (
    <div className="card">
      <div className="row">
        <p className="section-label mb-1">Share links</p>
        <p className="text-[13px] text-muted">
          Read-only. Anyone with the link can see what&rsquo;s next due, coverage, and balances — nothing else, and
          no sign-in needed. Revoke any link at any time.
        </p>
      </div>
      {links.map((l) => (
        <ShareLinkRow key={l.id} link={l} />
      ))}
      <form action={formAction} className="row flex items-center gap-2">
        <input name="label" placeholder="Label (optional)" className="input flex-1" />
        <button type="submit" disabled={pending} className="btn">
          {pending ? "…" : "New link"}
        </button>
      </form>
      {state?.error && <p className="row pt-0 text-alarm text-[13px]">{state.error}</p>}
    </div>
  );
}
