const PATHS: Record<string, React.ReactNode> = {
  "/": (
    <>
      <path d="M3.5 11.2 12 4l8.5 7.2" />
      <path d="M5.5 9.8V19a1 1 0 0 0 1 1H10v-5.2a2 2 0 0 1 4 0V20h3.5a1 1 0 0 0 1-1V9.8" />
    </>
  ),
  "/transactions": (
    <>
      <circle cx="4.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17" r="1.1" fill="currentColor" stroke="none" />
      <path d="M9 7h11M9 12h11M9 17h11" />
    </>
  ),
  "/budgets": (
    <>
      <path d="M12 3v9l7.8 4.5" />
      <circle cx="12" cy="12" r="8.5" />
    </>
  ),
  "/goals": (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.3" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  "/settings": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.13-1.3l2-1.55-2-3.46-2.36.95A7 7 0 0 0 15 4.6L14.6 2h-4L10 4.6a7 7 0 0 0-1.5.9L6.13 4.6l-2 3.46 2 1.55A7 7 0 0 0 5 12c0 .44.05.87.13 1.3l-2 1.55 2 3.46 2.36-.95c.45.37.96.68 1.51.9L10 22h4l.4-2.6c.55-.22 1.06-.53 1.51-.9l2.36.95 2-3.46-2-1.55c.08-.43.13-.86.13-1.3Z" />
    </>
  ),
  "/assistant": (
    <>
      <path d="M12 3.5l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4L12 3.5Z" />
      <path d="M18.5 14l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9Z" />
    </>
  ),
};

export function NavIcon({ href, size = 24, className }: { href: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[href] ?? PATHS["/"]}
    </svg>
  );
}
