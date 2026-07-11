"use client";

import { useState } from "react";

// Visual shell only — wired to real transaction/income inserts in Phase 3.
export function QuickAddFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick add transaction or income"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full btn-primary text-2xl leading-none flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 px-4 pb-4 md:pb-0"
          onClick={() => setOpen(false)}
        >
          <div className="glass w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="stat-label mb-4">Quick Add</div>
            <p className="text-text-dim text-sm">
              Transaction / income entry lands in Phase 3, wired to live Supabase data.
            </p>
            <button className="btn mt-6 w-full" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
