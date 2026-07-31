"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { restoreFromBackup } from "@/app/(app)/settings/actions";

/**
 * Restoring replaces everything, so it's gated behind reading a real file AND
 * typing RESTORE -- the same shape of confirmation this project has used for
 * other irreversible actions. Deliberately not undoable: the whole operation is
 * "put it back how it was", and an undo would just be another full replace.
 */
export function RestoreForm() {
  const [payload, setPayload] = useState<unknown | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  async function pick(file: File) {
    setError(null);
    setDone(null);
    setPayload(null);
    setSummary(null);
    setFileName(file.name);

    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setError("That file isn't valid JSON.");
      return;
    }

    // Describe what's actually in the file before anyone commits to replacing
    // their data with it -- an empty or wrong-shaped backup should be obvious
    // here, not after it has overwritten everything.
    if (typeof parsed !== "object" || parsed === null) {
      setError("That file isn't a Command Deck backup.");
      return;
    }
    const obj = parsed as Record<string, unknown>;
    if (!Array.isArray(obj.transactions) || !Array.isArray(obj.accounts)) {
      setError("That file isn't a Command Deck backup — no transactions or accounts in it.");
      return;
    }

    const parts = ["accounts", "payers", "fx_rates", "obligations", "obligation_installments", "transfers", "transactions"]
      .map((k) => (Array.isArray(obj[k]) ? `${(obj[k] as unknown[]).length} ${k}` : null))
      .filter(Boolean)
      .join(", ");

    setPayload(parsed);
    setSummary(parts);
  }

  function run() {
    if (!payload) return;
    setError(null);
    startTransition(async () => {
      const res = await restoreFromBackup(payload);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDone(res.counts ?? "Restored.");
      setPayload(null);
      setConfirm("");
      router.refresh();
    });
  }

  return (
    <div className="card">
      <div className="row">
        <p className="section-label mb-1">Restore a backup</p>
        <p className="text-[13px] text-muted">
          Replaces everything currently in the app with the contents of a backup file. Historical exchange
          rates are restored exactly as they were frozen, so past figures don&rsquo;t move.
        </p>
      </div>

      <div className="row">
        <input
          type="file"
          accept="application/json,.json"
          className="input"
          aria-label="Backup file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pick(file);
          }}
        />
        {summary && (
          <p className="text-[13px] text-muted mt-2">
            {fileName} — {summary}
          </p>
        )}
      </div>

      {payload !== null && (
        <div className="row flex flex-col gap-2">
          <label className="section-label" htmlFor="restore-confirm">
            Type RESTORE to confirm
          </label>
          <input
            id="restore-confirm"
            className="input"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
          />
          <button
            type="button"
            className="btn btn-destructive"
            disabled={busy || confirm !== "RESTORE"}
            onClick={run}
          >
            {busy ? "Restoring…" : "Replace everything"}
          </button>
        </div>
      )}

      {error && <p className="row text-alarm text-[13px]">{error}</p>}
      {done && <p className="row text-positive text-[13px]">Restored — {done}.</p>}
    </div>
  );
}
