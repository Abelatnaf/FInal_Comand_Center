"use client";

import { useState, useTransition } from "react";
import { deleteMyAccount } from "@/app/(app)/settings/actions";

export function DeleteAccountForm({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  function handleDelete() {
    if (!canDelete) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMyAccount();
      // A successful call redirects server-side and never returns here.
      if (res?.error) setError(res.error);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn !text-[var(--red)] !bg-[rgba(255,59,48,0.1)] hover:!bg-[rgba(255,59,48,0.16)]"
      >
        Delete Account
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 anim-backdrop">
          <div className="material w-full max-w-sm rounded-[16px] p-6 anim-modal">
            <div className="ios-title2 mb-2 text-[var(--red)]">Delete your account?</div>
            <p className="ios-body text-text-dim mb-4">
              This permanently deletes {email ? <span className="text-text">{email}</span> : "your account"} and
              every transaction, income entry, account, budget, goal, and receipt you&apos;ve logged. This cannot be
              undone — there is no recovery, no grace period, and no way for anyone to reverse this once it starts.
            </p>
            <p className="ios-footnote text-text-dim mb-2">
              Consider exporting your data first, in Settings → Account → Export.
            </p>
            <label className="stat-label block mb-1.5 mt-4">
              Type DELETE to confirm
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="input w-full mb-4"
              autoFocus
              placeholder="DELETE"
            />

            {error && <p className="text-[var(--red)] text-[13px] mb-3">{error}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                  setError(null);
                }}
                disabled={pending}
                className="btn !py-2 !px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || pending}
                className="btn !py-2 !px-4 text-sm !text-white !bg-[var(--red)] hover:!opacity-90 disabled:!opacity-40"
              >
                {pending ? "Deleting…" : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
