"use client";

import { useState } from "react";
import { attachStatement } from "@/app/(app)/bills/actions";
import { ReceiptLink } from "@/components/money/ReceiptLink";

/**
 * The bill's own paperwork, as opposed to a receipt proving a payment was made.
 * Stored in the same private bucket, so viewing goes through the same
 * short-lived signed-URL path.
 */
export function StatementUpload({
  obligationId,
  statementPath,
}: {
  obligationId: string;
  statementPath: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card">
      <div className="row">
        <p className="section-label mb-1">Statement</p>
        <p className="text-[13px] text-muted">
          The bill itself — the document you&rsquo;d need if you ever had to query the charge.
        </p>
      </div>

      <div className="row flex items-center gap-3 flex-wrap">
        {statementPath && <ReceiptLink path={statementPath} />}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="input flex-1 min-w-[140px]"
          aria-label={statementPath ? "Replace statement" : "Attach statement"}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const fd = new FormData();
            fd.set("statement", file);
            setBusy(true);
            setError(null);
            const res = await attachStatement(obligationId, fd);
            setBusy(false);
            setError(res.error ?? null);
          }}
        />
        {busy && <span className="text-muted text-[13px]">Uploading…</span>}
      </div>

      {error && <p className="row text-alarm text-[13px]">{error}</p>}
    </div>
  );
}
