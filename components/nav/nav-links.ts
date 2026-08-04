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
    href: "/semesters",
    label: "Terms",
    icon: "upcoming" as const,
    blurb: "Semester dates your money stretches across",
  },
  {
    href: "/split",
    label: "Split",
    icon: "accounts" as const,
    blurb: "What roommates and friends owe you",
  },
  {
    href: "/meal-plan",
    label: "Meal plan",
    icon: "recurring" as const,
    blurb: "Swipes and dining dollars against the term",
  },
  {
    href: "/loans",
    label: "Student loans",
    icon: "bills" as const,
    blurb: "What you've borrowed and what it'll cost",
  },
  {
    href: "/insights",
    label: "Insights",
    icon: "insights" as const,
    blurb: "Trends, category breakdowns, month by month",
  },
  {
    href: "/reports",
    label: "Year in review",
    icon: "insights" as const,
    blurb: "Your whole year on one page",
  },
  {
    href: "/import",
    label: "Import from your bank",
    icon: "ledger" as const,
    blurb: "Bring in a CSV instead of typing it",
  },
  { href: "/bills", label: "Bills", icon: "bills" as const, blurb: "Tuition, rent and anything else due" },
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
    blurb: "Accounts, categories, auto-categorize rules, backup",
  },
] as const;
