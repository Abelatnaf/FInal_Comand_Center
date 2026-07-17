// Thin wrapper over the Resend API (https://resend.com) — a single POST,
// no SDK dependency needed for that. If RESEND_API_KEY isn't configured
// yet, this no-ops with a clear log line instead of throwing, so the cron
// routes can still be exercised (and their logs read) before Abel finishes
// setting up an email provider — see the setup note in
// app/api/cron/weekly-digest/route.ts.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATIONS_FROM_EMAIL || "Command Deck <notifications@resend.dev>";

  if (!apiKey) {
    console.warn(`[notifications] RESEND_API_KEY not set — would have sent "${subject}" to ${to}. Skipping.`);
    return { sent: false, reason: "no_api_key" as const };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[notifications] Resend request failed (${res.status}) for ${to}: ${body}`);
    return { sent: false, reason: "provider_error" as const };
  }

  return { sent: true as const };
}
