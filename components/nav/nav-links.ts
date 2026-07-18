export type NavGroup = "everyday" | "plan" | "more";

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  everyday: "Everyday",
  plan: "Track & Plan",
  more: "More",
};

export const NAV_LINKS = [
  { href: "/", label: "Home", blurb: "Your money at a glance", group: "everyday" },
  { href: "/transactions", label: "Transactions", blurb: "Things you bought", group: "everyday" },
  { href: "/income", label: "Income", blurb: "Money you got paid", group: "everyday" },
  { href: "/transfers", label: "Transfers", blurb: "Moving money between accounts", group: "everyday" },

  { href: "/weekly-rollup", label: "Weekly Summary", blurb: "This week, at a glance", group: "plan" },
  { href: "/monthly-rollup", label: "Monthly Summary", blurb: "This month, at a glance", group: "plan" },
  { href: "/recurring-bills", label: "Bills & Paychecks", blurb: "Things that repeat every month", group: "plan" },
  { href: "/savings-goals", label: "Savings Goals", blurb: "Money you're saving up for", group: "plan" },
  { href: "/net-worth", label: "Net Worth", blurb: "Everything you have, all together", group: "plan" },
  { href: "/forecast", label: "Forecast", blurb: "What's coming up ahead", group: "plan" },
  { href: "/insights", label: "Insights", blurb: "Fun facts about your money", group: "plan" },

  { href: "/close", label: "Monthly Checkup", blurb: "Double-check last month is right", group: "more" },
  { href: "/tax-report", label: "Taxes", blurb: "What you'll need at tax time", group: "more" },
  { href: "/import", label: "Add from Bank", blurb: "Bring in your bank statement", group: "more" },
  { href: "/audit-log", label: "History", blurb: "Every change, ever made", group: "more" },
  { href: "/settings", label: "Settings", blurb: "Your name, accounts, and options", group: "more" },
] as const;
