"use client";

import { useState, useTransition } from "react";
import { getReceiptUrl } from "@/app/(app)/ledger/actions";

/**
 * Opens a receipt through a freshly-minted short-lived signed URL. The bucket
 * is private, so nothing here is a durable link -- the URL is fetched on the
 * click and then discarded.
 */
export function ReceiptLink({ path }: { path: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  function open() {
    setError(null);
    startTransition(async () => {
      const res = await getReceiptUrl(path);
      if (res.error || !res.url) {
        setError("Couldn't open that receipt.");
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <>
      <button type="button" onClick={open} disabled={busy} className="text-accent text-[13px]">
        {busy ? "Opening…" : "Receipt"}
      </button>
      {error && <span className="text-alarm text-[12px] ml-2">{error}</span>}
    </>
  );
}
