"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type PendingUndo = {
  label: string;
  onCommit: () => Promise<unknown> | void;
  onUndo?: () => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

type ScheduleArgs = {
  label: string;
  onCommit: () => Promise<unknown> | void;
  onUndo?: () => void;
};

const UndoContext = createContext<{ scheduleUndo: (args: ScheduleArgs) => void } | null>(null);

const UNDO_WINDOW_MS = 6000;

/**
 * A real "undo" window for delete actions, without ever writing then
 * un-writing data: the server action isn't called until the window
 * expires. This sidesteps a genuine correctness trap a naive
 * delete-then-reinsert approach would hit -- reinserting a deleted
 * transaction would fire the FX-freeze trigger fresh and reprice it at
 * whatever rate is current then, not the rate it was originally frozen
 * at. Delaying the delete instead means nothing ever needs restoring.
 */
export function UndoToastProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingUndo | null>(null);
  const pendingRef = useRef<PendingUndo | null>(null);

  const commitNow = useCallback((p: PendingUndo | null) => {
    if (!p) return;
    clearTimeout(p.timeoutId);
    void p.onCommit();
  }, []);

  const scheduleUndo = useCallback(
    ({ label, onCommit, onUndo }: ScheduleArgs) => {
      // Only one undo toast at a time -- a second delete commits whatever
      // was already pending rather than trying to stack two windows.
      commitNow(pendingRef.current);

      const timeoutId = setTimeout(() => {
        pendingRef.current = null;
        setPending(null);
        void onCommit();
      }, UNDO_WINDOW_MS);

      const next: PendingUndo = { label, onCommit, onUndo, timeoutId };
      pendingRef.current = next;
      setPending(next);
    },
    [commitNow]
  );

  function handleUndo() {
    const p = pendingRef.current;
    if (!p) return;
    clearTimeout(p.timeoutId);
    pendingRef.current = null;
    setPending(null);
    p.onUndo?.();
  }

  return (
    <UndoContext.Provider value={{ scheduleUndo }}>
      {children}
      {pending && (
        <div className="toast" role="status">
          <span className="text-[14px] text-text">{pending.label}</span>
          <button type="button" className="btn shrink-0" style={{ minHeight: 0, padding: "8px 14px" }} onClick={handleUndo}>
            Undo
          </button>
        </div>
      )}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error("useUndo must be used within UndoToastProvider");
  return ctx;
}
