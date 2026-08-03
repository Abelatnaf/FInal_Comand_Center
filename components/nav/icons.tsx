// Simple stroke-path icons -- deliberately plain, not traced/complex.
type IconProps = { className?: string };

export function NowIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 11.5 12 5l8 6.5M6 10v8.5a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1V10"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AddIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx={12} cy={12} r={8.25} stroke="currentColor" strokeWidth={1.6} />
      <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export function BillsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.5 4h8l3 3v13a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <path d="M9 12h6M9 15.5h6M9 8.5h3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export function LedgerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 4.5h14v15l-2.5-1.5-2.5 1.5-2-1.5-2 1.5-2.5-1.5-2.5 1.5v-15Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M8 9h8M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx={12} cy={12} r={3} stroke="currentColor" strokeWidth={1.6} />
      <path
        d="M12 4.5v2M12 17.5v2M4.5 12h2M17.5 12h2M6.5 6.5l1.4 1.4M16.1 16.1l1.4 1.4M6.5 17.5l1.4-1.4M16.1 7.9l1.4-1.4"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BudgetsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx={12} cy={12} r={8} stroke="currentColor" strokeWidth={1.6} />
      <path d="M12 4a8 8 0 0 1 8 8h-8V4Z" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

export function MoreIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx={5.5} cy={12} r={1.5} fill="currentColor" />
      <circle cx={12} cy={12} r={1.5} fill="currentColor" />
      <circle cx={18.5} cy={12} r={1.5} fill="currentColor" />
    </svg>
  );
}

export function InsightsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 19.5V15M9.33 19.5V9M14.67 19.5v-6M20 19.5V5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

export function GoalsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx={12} cy={12} r={8} stroke="currentColor" strokeWidth={1.6} />
      <circle cx={12} cy={12} r={4} stroke="currentColor" strokeWidth={1.6} />
      <circle cx={12} cy={12} r={1.2} fill="currentColor" />
    </svg>
  );
}

export function RecurringIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 12a7 7 0 0 1 11.9-5M19 12a7 7 0 0 1-11.9 5"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <path d="M17 3.5V7h-3.5M7 20.5V17h3.5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AccountsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x={3} y={6} width={18} height={12} rx={2} stroke="currentColor" strokeWidth={1.6} />
      <path d="M3 10h18" stroke="currentColor" strokeWidth={1.6} />
      <path d="M7 14.5h3" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export function UpcomingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x={4} y={5.5} width={16} height={14} rx={2} stroke="currentColor" strokeWidth={1.6} />
      <path d="M4 10h16M9 3.5v4M15 3.5v4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

export const ICONS = {
  now: NowIcon,
  add: AddIcon,
  bills: BillsIcon,
  ledger: LedgerIcon,
  settings: SettingsIcon,
  budgets: BudgetsIcon,
  more: MoreIcon,
  insights: InsightsIcon,
  goals: GoalsIcon,
  recurring: RecurringIcon,
  accounts: AccountsIcon,
  upcoming: UpcomingIcon,
};
