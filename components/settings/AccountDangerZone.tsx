"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMyAccount } from "@/app/(app)/settings/actions";

/**
 * Deleting an account is irreversible and takes the whole ledger with it, so
 * it asks for the word to be typed rather than relying on a single tap.
 */
export function AccountDangerZone({ email }: { email: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="card">
      <div className="row">
        <p className="section-label mb-1">Your account</p>
        <p className="text-[14px] text-muted">{email}</p>
      </div>

      {!open ? (
        <div className="row">
          <button type="button" className="text-alarm text-[14px]" onClick={() => setOpen(true)}>
            Delete my account and all my data
          </button>
        </div>
      ) : (
        <div className="row flex flex-col gap-3">
          <p className="text-[14px] text-text">
            This permanently deletes every transaction, account, budget and goal, plus your login. It
            cannot be undone. Export your data first if you want a copy.
          </p>
          <input
            className="input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            aria-label="Type DELETE to confirm"
          />
          {error && <p className="text-alarm text-[13px]">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn flex-1" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-destructive flex-1"
              disabled={confirmText !== "DELETE" || busy}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteMyAccount();
                  if (res.error) {
                    setError(res.error);
                    return;
                  }
                  router.push("/login");
                })
              }
            >
              {busy ? "Deleting…" : "Delete forever"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
