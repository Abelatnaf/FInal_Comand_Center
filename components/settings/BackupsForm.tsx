"use client";

import { useState, useTransition } from "react";
import { Glass } from "@/components/glass/Glass";
import { downloadJson } from "@/lib/csv";
import { createBackupNow, getBackupData, deleteBackup, restoreBackup } from "@/app/(app)/settings/backup-actions";

export type BackupRow = { id: string; created_at: string; source: string };

function RestoreConfirm({ backupId, createdAt, onDone }: { backupId: string; createdAt: string; onDone: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canRestore = confirmText.trim().toUpperCase() === "RESTORE";

  function handleRestore() {
    if (!canRestore) return;
    setError(null);
    startTransition(async () => {
      const res = await restoreBackup(backupId);
      if (res?.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 anim-backdrop">
      <div className="material w-full max-w-sm rounded-[16px] p-6 anim-modal">
        <div className="ios-title2 mb-2 text-[var(--red)]">Restore this backup?</div>
        <p className="ios-body text-text-dim mb-4">
          This replaces everything currently in your account — transactions, income, accounts, currencies, bills,
          goals, transfers, net worth history — with the state saved on {new Date(createdAt).toLocaleString()}. Any
          changes made since then are gone. Any closed months will be reopened automatically.
        </p>
        <label className="stat-label block mb-1.5 mt-4">Type RESTORE to confirm</label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="input w-full mb-4"
          autoFocus
          placeholder="RESTORE"
        />
        {error && <p className="text-[var(--red)] text-[13px] mb-3">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onDone} disabled={pending} className="btn !py-2 !px-4 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={!canRestore || pending}
            className="btn !py-2 !px-4 text-sm !text-white !bg-[var(--red)] hover:!opacity-90 disabled:!opacity-40"
          >
            {pending ? "Restoring…" : "Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function BackupsForm({ initialBackups }: { initialBackups: BackupRow[] }) {
  const [backups, setBackups] = useState(initialBackups);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupRow | null>(null);

  function handleBackupNow() {
    setError(null);
    startTransition(async () => {
      const res = await createBackupNow();
      if (res?.error) setError(res.error);
      else window.location.reload();
    });
  }

  function handleDownload(id: string, createdAt: string) {
    startTransition(async () => {
      const res = await getBackupData(id);
      if ("error" in res) {
        setError(res.error ?? "Couldn't download that backup.");
        return;
      }
      downloadJson(res.data, `command-deck-backup-${createdAt.slice(0, 10)}.json`);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this backup? This can't be undone.")) return;
    startTransition(async () => {
      const res = await deleteBackup(id);
      if (res?.error) setError(res.error);
      else setBackups((prev) => prev.filter((b) => b.id !== id));
    });
  }

  return (
    <Glass className="p-6 max-w-xl">
      <div className="flex items-center justify-between mb-1">
        <div className="ios-headline">Backups</div>
        <button onClick={handleBackupNow} disabled={pending} className="btn text-sm">
          {pending ? "Working…" : "Back Up Now"}
        </button>
      </div>
      <p className="text-text-dim ios-subhead mb-4">
        A full snapshot is also taken automatically every Monday — the 8 most recent automatic snapshots are kept.
      </p>

      {error && <p className="text-[var(--red)] text-[13px] mb-3">{error}</p>}

      {backups.length === 0 ? (
        <p className="text-text-dim ios-subhead">No backups yet.</p>
      ) : (
        <div className="flex flex-col">
          {backups.map((b, i) => (
            <div key={b.id}>
              {i > 0 && <div className="h-px bg-[var(--separator)]" />}
              <div className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="ios-subhead text-text">{new Date(b.created_at).toLocaleString()}</div>
                  <div className="stat-label mt-0.5">{b.source === "scheduled" ? "Automatic" : "Manual"}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => handleDownload(b.id, b.created_at)} className="link-action text-[13px]">
                    Download
                  </button>
                  <button onClick={() => setRestoreTarget(b)} className="link-action text-[13px]">
                    Restore
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="link-destructive text-[13px]">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {restoreTarget && (
        <RestoreConfirm
          backupId={restoreTarget.id}
          createdAt={restoreTarget.created_at}
          onDone={() => {
            setRestoreTarget(null);
            window.location.reload();
          }}
        />
      )}
    </Glass>
  );
}
