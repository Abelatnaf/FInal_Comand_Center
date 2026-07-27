"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4 items-center text-center py-16 px-4">
      <p className="text-[17px] text-text font-medium">Something went wrong</p>
      <p className="text-[14px] text-muted max-w-xs">
        That&rsquo;s a bug, not a lost entry — nothing you&rsquo;ve saved is affected.
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn">
          Back to Now
        </Link>
      </div>
    </div>
  );
}
