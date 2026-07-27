"use client";

import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

/**
 * Marks whatever's on screen as potentially stale the moment connectivity
 * drops -- matching the .estimate honesty treatment already used for
 * live-rate figures. This is deliberately blunt (offline = stale) rather
 * than tracking per-response cache provenance, which would need far more
 * machinery for the same practical guarantee.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="card row text-center">
      <p className="estimate text-[13px]">Offline — showing last saved data</p>
    </div>
  );
}
