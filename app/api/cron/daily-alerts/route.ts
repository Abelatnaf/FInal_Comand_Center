import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { computeCurrentBalance, computeBudgetVsActualThisMonth } from "@/lib/notifications/per-user-queries";
import { buildDailyAlertsHtml, hasAnyDailyAlerts } from "@/lib/notifications/digest";
import { sendEmail } from "@/lib/notifications/send-email";

// Triggered by Vercel Cron (see vercel.json) — daily. Same setup
// requirements as app/api/cron/weekly-digest/route.ts (service role key,
// email provider key, optional cron secret) — see that file's header for
// the exact steps.
//
// Mirrors the in-app AlertsBanner logic (app/(app)/layout.tsx) but across
// every opted-in user via the service-role client, and only for users who
// turned on notify_budget_alerts or notify_bill_reminders (checked
// separately, since a user could want one without the other).

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Setup incomplete" }, { status: 500 });
  }

  const { data: optedIn, error } = await supabase
    .from("settings")
    .select("user_id, low_balance_threshold, notify_budget_alerts, notify_bill_reminders")
    .or("notify_budget_alerts.eq.true,notify_bill_reminders.eq.true");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const today = now.getDate();

  let sent = 0;
  const skipped: string[] = [];

  for (const row of optedIn ?? []) {
    const userId = row.user_id;

    const userRes = await supabase.auth.admin.getUserById(userId);
    const email = userRes.data.user?.email;
    if (!email) {
      skipped.push(userId);
      continue;
    }

    const overBudget: { category: string; over: number }[] = [];
    if (row.notify_budget_alerts) {
      const rows = await computeBudgetVsActualThisMonth(supabase, userId);
      for (const r of rows) {
        if (r.budget > 0 && r.actual > r.budget) {
          overBudget.push({ category: r.category, over: r.actual - r.budget });
        }
      }
    }

    const billsDue: { name: string; amount: number; daysUntil: number }[] = [];
    let lowBalance: { current: number; threshold: number } | null = null;
    if (row.notify_bill_reminders) {
      const { data: bills } = await supabase
        .from("recurring_bills")
        .select("name, monthly_cost_usd, billing_day")
        .eq("user_id", userId)
        .eq("active", true);
      for (const b of bills ?? []) {
        if (!b.billing_day) continue;
        const daysUntil =
          b.billing_day >= today
            ? b.billing_day - today
            : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - today + b.billing_day;
        if (daysUntil <= 1) billsDue.push({ name: b.name, amount: b.monthly_cost_usd, daysUntil });
      }

      if (row.low_balance_threshold != null) {
        const current = await computeCurrentBalance(supabase, userId);
        if (current < row.low_balance_threshold) {
          lowBalance = { current, threshold: row.low_balance_threshold };
        }
      }
    }

    const data = { overBudget, billsDue, lowBalance };
    if (!hasAnyDailyAlerts(data)) continue;

    const result = await sendEmail({ to: email, subject: "Command Deck — Heads up", html: buildDailyAlertsHtml(data) });
    if (result.sent) sent++;
  }

  return NextResponse.json({ ok: true, candidates: (optedIn ?? []).length, sent, skipped });
}
