"use client";

import { useEffect, useState } from "react";

/**
 * True/false, tracked live via the online/offline events. Starts `true`
 * (the SSR/pre-hydration default) and corrects itself on mount -- there is
 * no server-side notion of the client's connectivity to seed this with.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}
