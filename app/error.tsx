"use client";

import { useEffect } from "react";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="card row max-w-sm text-center flex flex-col gap-4">
        <p className="text-[17px] text-text font-medium">Something went wrong</p>
        <p className="text-[14px] text-muted">That&rsquo;s a bug, not a lost entry.</p>
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
      </div>
    </div>
  );
}
