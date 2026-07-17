import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { computeCurrentBalance } from "@/lib/notifications/per-user-queries";
import { buildWeeklyDigestHtml } from "@/lib/notifications/digest";
import { sendEmail } from "@/lib/notifications/send-email";

// Triggered by Vercel Cron (see vercel.json) — weekly, Monday mornings.
//
// SETUP REQUIRED before this actually sends anything:
//   1. Add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars (Supabase dashboard
//      → Settings → API → service_role key). This route can't read across
//      users without it — it'll return a 500 with a clear message until
//      it's set.
//   2. Sign up for an email provider (this is wired for Resend —
//      resend.com — but any provider works if you swap send-email.ts) and
//      add RESEND_API_KEY to Vercel env vars.
//   3. Optional but recommended: add CRON_SECRET to Vercel env vars.
//      Vercel automatically sends it as a Bearer token on cron-triggered
//      requests once set, and this route checks for it. Without it, the
//      route is reachable by anyone who finds the URL — low-risk before
//      step 2 (nothing sends without an API key), a real one after.
// Until all three are set, this route safely no-ops per-user (logs a
// warning per skipped email) rather than failing loudly.

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

  const { data: optedIn, error } = await supabase.from("settings").select("user_id").eq("notify_weekly_digest", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekLabel = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  let sent = 0;
  const skipped: string[] = [];

  for (const row of optedIn ?? []) {
    const userId = row.user_id;

    const [userRes, txRes, incomeRes, balance] = await Promise.all([
      supabase.auth.admin.getUserById(userId),
      supabase
        .from("transactions")
        .select("amount_usd, category_id, categories(name)")
        .eq("user_id", userId)
        .gte("date", weekStartStr),
      supabase.from("income").select("amount_usd").eq("user_id", userId).gte("date", weekStartStr),
      computeCurrentBalance(supabase, userId),
    ]);

    const email = userRes.data.user?.email;
    if (!email) {
      skipped.push(userId);
      continue;
    }

    const tx = txRes.data ?? [];
    const totalSpend = tx.reduce((s, t) => s + (t.amount_usd ?? 0), 0);
    const totalIncome = (incomeRes.data ?? []).reduce((s, i) => s + (i.amount_usd ?? 0), 0);

    const byCategory = new Map<string, number>();
    for (const t of tx) {
      const name = t.categories?.name ?? "Uncategorized";
      byCategory.set(name, (byCategory.get(name) ?? 0) + (t.amount_usd ?? 0));
    }
    const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

    const html = buildWeeklyDigestHtml({
      weekLabel,
      totalSpend,
      totalIncome,
      currentBalance: balance,
      topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
    });

    const result = await sendEmail({ to: email, subject: `Your week — ${weekLabel}`, html });
    if (result.sent) sent++;
  }

  return NextResponse.json({ ok: true, candidates: (optedIn ?? []).length, sent, skipped });
}
