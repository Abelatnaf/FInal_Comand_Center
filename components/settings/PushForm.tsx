"use client";

import { useEffect, useState } from "react";
import { savePushSubscription, removePushSubscription } from "@/app/(app)/settings/push-actions";

/**
 * Turning reminders on for this device.
 *
 * Everything is gated on what the browser actually reports rather than on what
 * we'd like to be true: whether push exists at all, whether permission was
 * already denied (which no button can undo -- only the browser's own site
 * settings can), and whether this device is already subscribed.
 */
export function PushForm({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    // Reading browser capability has to happen after mount -- doing it during
    // render would disagree with the server pass and break hydration. This is
    // the same external-sync suppression the rest of this codebase uses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(ok);
    if (!ok) return;
    setPermission(Notification.permission);

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint ?? null))
      .catch(() => setEndpoint(null));
  }, []);

  async function enable() {
    if (!vapidPublicKey) return;
    setBusy(true);
    setError(null);
    try {
      const granted = await Notification.requestPermission();
      setPermission(granted);
      if (granted !== "granted") {
        setError("Notifications are blocked for this site.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = sub.toJSON() as { keys?: { p256dh?: string; auth?: string } };
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setEndpoint(sub.endpoint);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn reminders on.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await removePushSubscription(sub.endpoint);
      }
      setEndpoint(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn reminders off.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="row">
        <p className="section-label mb-1">Reminders</p>
        <p className="text-[13px] text-muted">
          A nudge when a bill or a standing charge is due in the next two weeks, even with the app
          closed. Nothing is sent on a day with nothing due.
        </p>
      </div>

      <div className="row">
        {supported === false && (
          <p className="text-[14px] text-muted">
            This browser can&rsquo;t do push notifications. On an iPhone they only work once the app
            is added to the Home Screen.
          </p>
        )}

        {supported && !vapidPublicKey && (
          <p className="text-[14px] text-muted">
            Not set up on the server yet. Generate a key pair with{" "}
            <code className="text-text">npx web-push generate-vapid-keys</code> and set{" "}
            <code className="text-text">VAPID_PUBLIC_KEY</code>,{" "}
            <code className="text-text">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> and{" "}
            <code className="text-text">VAPID_PRIVATE_KEY</code>.
          </p>
        )}

        {supported && vapidPublicKey && permission === "denied" && (
          <p className="text-[14px] text-muted">
            Notifications are blocked for this site. That can only be undone in your browser&rsquo;s
            own settings, not from here.
          </p>
        )}

        {supported && vapidPublicKey && permission !== "denied" && (
          <div className="flex items-center gap-3">
            {endpoint ? (
              <>
                <span className="status-pill" data-status="paid">
                  On
                </span>
                <button type="button" className="btn text-[14px]" disabled={busy} onClick={disable}>
                  {busy ? "…" : "Turn off for this device"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-primary text-[14px]"
                disabled={busy}
                onClick={enable}
              >
                {busy ? "…" : "Remind me on this device"}
              </button>
            )}
          </div>
        )}

        {error && <p className="text-alarm text-[13px] mt-2">{error}</p>}
      </div>
    </div>
  );
}

/**
 * The VAPID key is base64url text, but PushManager.subscribe wants raw bytes.
 * Converted here rather than stored pre-decoded so the value in the
 * environment matches what `web-push generate-vapid-keys` prints.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalised);
  // Backed by a plain ArrayBuffer explicitly: applicationServerKey rejects a
  // view over a SharedArrayBuffer, which is what the default Uint8Array type
  // leaves open.
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
