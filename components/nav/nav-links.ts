/** The five thumb-reachable destinations. Add sits in the middle, raised. */
export const TAB_LINKS = [
  { href: "/", label: "Home", icon: "now" as const },
  { href: "/ledger", label: "Ledger", icon: "ledger" as const },
  { href: "/add", label: "Add", icon: "add" as const },
  { href: "/budgets", label: "Budgets", icon: "budgets" as const },
  { href: "/more", label: "More", icon: "more" as const },
] as const;

/** Everything that doesn't earn a tab, grouped on /more. */
export const MORE_LINKS = [
  {
    href: "/insights",
    label: "Insights",
    icon: "insights" as const,
    blurb: "Trends, category breakdowns, month by month",
  },
  { href: "/bills", label: "Bills", icon: "bills" as const, blurb: "What you owe and when it's due" },
  {
    href: "/recurring",
    label: "Recurring",
    icon: "recurring" as const,
    blurb: "Subscriptions and standing charges",
  },
  { href: "/goals", label: "Goals", icon: "goals" as const, blurb: "What you're saving towards" },
  { href: "/upcoming", label: "Upcoming", icon: "upcoming" as const, blurb: "Everything scheduled ahead" },
  {
    href: "/settings",
    label: "Settings",
    icon: "settings" as const,
    blurb: "Categories, accounts, exchange rate, backup",
  },
] as const;
