import { fmtUsd } from "@/lib/format";

const WRAPPER_STYLE =
  "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; color: #1d1d1f;";
const CARD_STYLE = "background: #f5f5f7; border-radius: 12px; padding: 16px; margin: 12px 0;";
const HEADING_STYLE = "font-size: 20px; font-weight: 700; margin: 0 0 4px;";
const MUTED_STYLE = "color: #6e6e73; font-size: 13px;";

export type WeeklyDigestData = {
  weekLabel: string;
  totalSpend: number;
  totalIncome: number;
  currentBalance: number;
  topCategory: { name: string; amount: number } | null;
};

export function buildWeeklyDigestHtml(data: WeeklyDigestData): string {
  const net = data.totalIncome - data.totalSpend;
  return `
    <div style="${WRAPPER_STYLE}">
      <h1 style="${HEADING_STYLE}">Your week — ${data.weekLabel}</h1>
      <p style="${MUTED_STYLE}">A quick summary from Command Deck.</p>
      <div style="${CARD_STYLE}">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr><td style="padding: 6px 0;">Spent</td><td style="text-align: right; font-weight: 600;">${fmtUsd(data.totalSpend)}</td></tr>
          <tr><td style="padding: 6px 0;">Income</td><td style="text-align: right; font-weight: 600;">${fmtUsd(data.totalIncome)}</td></tr>
          <tr><td style="padding: 6px 0; border-top: 1px solid #d2d2d7;">Net</td><td style="text-align: right; font-weight: 600; border-top: 1px solid #d2d2d7;">${fmtUsd(net)}</td></tr>
        </table>
      </div>
      ${
        data.topCategory
          ? `<p style="font-size: 14px;">Biggest category this week: <strong>${data.topCategory.name}</strong> at ${fmtUsd(data.topCategory.amount)}.</p>`
          : ""
      }
      <p style="font-size: 14px;">Current balance: <strong>${fmtUsd(data.currentBalance)}</strong></p>
      <p style="${MUTED_STYLE}">You're getting this because weekly digest emails are on in Settings → Account → Notifications.</p>
    </div>
  `;
}

export type DailyAlertsData = {
  overBudget: { category: string; over: number }[];
  billsDue: { name: string; amount: number; daysUntil: number }[];
  lowBalance: { current: number; threshold: number } | null;
};

export function hasAnyDailyAlerts(data: DailyAlertsData): boolean {
  return data.overBudget.length > 0 || data.billsDue.length > 0 || data.lowBalance !== null;
}

export function buildDailyAlertsHtml(data: DailyAlertsData): string {
  const sections: string[] = [];

  if (data.lowBalance) {
    sections.push(
      `<div style="${CARD_STYLE}"><strong>Low balance</strong><p style="margin: 4px 0 0;">Your balance (${fmtUsd(data.lowBalance.current)}) is below your ${fmtUsd(data.lowBalance.threshold)} alert threshold.</p></div>`
    );
  }
  if (data.billsDue.length > 0) {
    const items = data.billsDue
      .map((b) => `<li>${b.name} — ${fmtUsd(b.amount)}, due ${b.daysUntil === 0 ? "today" : "tomorrow"}</li>`)
      .join("");
    sections.push(`<div style="${CARD_STYLE}"><strong>Bills due soon</strong><ul style="margin: 8px 0 0; padding-left: 18px;">${items}</ul></div>`);
  }
  if (data.overBudget.length > 0) {
    const items = data.overBudget.map((c) => `<li>${c.category} — ${fmtUsd(c.over)} over budget</li>`).join("");
    sections.push(`<div style="${CARD_STYLE}"><strong>Over budget</strong><ul style="margin: 8px 0 0; padding-left: 18px;">${items}</ul></div>`);
  }

  return `
    <div style="${WRAPPER_STYLE}">
      <h1 style="${HEADING_STYLE}">Heads up</h1>
      <p style="${MUTED_STYLE}">Something needs your attention in Command Deck.</p>
      ${sections.join("")}
      <p style="${MUTED_STYLE}">You're getting this because alert emails are on in Settings → Account → Notifications.</p>
    </div>
  `;
}
