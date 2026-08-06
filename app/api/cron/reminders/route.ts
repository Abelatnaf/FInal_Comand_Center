import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPush, pushConfigured } from "@/lib/push";
import { formatMoney } from "@/lib/money";
import { todayIso } from "@/lib/date";

/**
 * Daily due-bill reminders.
 *
 * Set up on Vercel Cron (see vercel.json). Requires, as environment
 * variables you set yourself:
 *
 *   VAPID_PUBLIC_KEY / NEXT_PUBLIC_VAPID_PUBLIC_KEY   (the same value)
 *   VAPID_PRIVATE_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CRON_SECRET                                        (optional but advised)
 *
 * Generate the VAPID pair with:
 *   npx web-push generate-vapid-keys
 *
 * Until those exist this route is a no-op that says so in its response rather
 * than throwing or pretending to have sent something -- the same honest
 * scaffolding this project used for its email cron routes.
 */

/** Only nag about things landing inside this many days. Matches Home. */
const DUE_SOON_DAYS = 14;

export async function GET(request: NextRequest) {
  // Vercel Cron sends the secret as a bearer token. Checked before anything
  // else so an unauthenticated hit can't even learn whether push is set up.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!pushConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: "push is not configured",
      hint: "Set VAPID_PUBLIC_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
    });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({
      ok: true,
      skipped: "SUPABASE_SERVICE_ROLE_KEY is not set",
    });
  }

  const { data: reminders, error: remindersError } = await supabase.rpc("due_reminders", {
    p_days: DUE_SOON_DAYS,
  });
  if (remindersError) {
    return NextResponse.json({ ok: false, error: remindersError.message }, { status: 500 });
  }

  const { data: subs, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("is_active", true);
  if (subsError) {
    return NextResponse.json({ ok: false, error: subsError.message }, { status: 500 });
  }

  // Grouped by user explicitly. There is no auth.uid() on this connection, so
  // nothing scopes these rows for us.
  const byUser = new Map<string, typeof reminders>();
  for (const r of reminders ?? []) {
    if (!r.user_id) continue;
    const list = byUser.get(r.user_id) ?? [];
    list.push(r);
    byUser.set(r.user_id, list);
  }

  const today = todayIso();
  let sent = 0;
  let deactivated = 0;
  const failures: string[] = [];

  for (const sub of subs ?? []) {
    const due = byUser.get(sub.user_id);
    // No news is not news. A daily "nothing is due" notification is how a
    // person learns to swipe this app away without reading it.
    if (!due || due.length === 0) continue;

    const first = due[0];
    const overdue = first.due_on != null && first.due_on < today;
    const body =
      due.length === 1
        ? `${first.title} · ${formatMoney(BigInt(first.amount_minor ?? 0))}`
        : `${first.title} and ${due.length - 1} more · ${formatMoney(
            due.reduce((s, d) => s + BigInt(d.amount_minor ?? 0), 0n)
          )}`;

    const result = await sendPush(sub, {
      title: overdue ? "Past due" : "Due soon",
      body,
      url: "/upcoming",
      // One tag per day, so a second run replaces the morning's notification
      // instead of stacking a duplicate.
      tag: `due-${today}`,
    });

    if (result.sent) {
      sent += 1;
      await supabase
        .from("push_subscriptions")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("id", sub.id);
    } else if (result.gone) {
      // The browser discarded this subscription. Retrying it daily forever
      // would be pure noise, so it stops being active.
      deactivated += 1;
      await supabase.from("push_subscriptions").update({ is_active: false }).eq("id", sub.id);
    } else {
      failures.push(result.reason);
    }
  }

  return NextResponse.json({
    ok: true,
    subscriptions: subs?.length ?? 0,
    usersWithSomethingDue: byUser.size,
    sent,
    deactivated,
    failures,
  });
}
