import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export type SendResult =
  | { sent: true }
  | { sent: false; gone: true }
  | { sent: false; gone: false; reason: string };

/**
 * Whether push is actually configured.
 *
 * Kept as an explicit check rather than letting web-push throw, because every
 * surface that touches push needs to be able to say "not set up yet" in plain
 * language instead of failing: the Settings card hides the toggle, and the
 * cron route reports a no-op rather than a 500.
 */
export function pushConfigured(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  );
}

let configured = false;

function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    // A mailto: subject is required by the spec so a push service has someone
    // to contact about a misbehaving sender.
    process.env.VAPID_SUBJECT || "mailto:noreply@example.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

/**
 * Sends one notification.
 *
 * A 404 or 410 from the push service means the browser threw the subscription
 * away -- the user cleared site data, or uninstalled the app. That is reported
 * as `gone` rather than as an error so the caller can deactivate the row
 * instead of retrying it every day forever.
 */
export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<SendResult> {
  if (!pushConfigured()) {
    return { sent: false, gone: false, reason: "VAPID keys are not set" };
  }
  configure();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return { sent: true };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return { sent: false, gone: true };
    return {
      sent: false,
      gone: false,
      reason: err instanceof Error ? err.message : "unknown push error",
    };
  }
}
