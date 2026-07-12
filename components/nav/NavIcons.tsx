const P: Record<string, React.ReactNode> = {
  "/": (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  "/transactions": (
    <>
      <path d="M4 7h13M4 7l3-3M4 7l3 3" />
      <path d="M20 17H7M20 17l-3-3M20 17l-3 3" />
    </>
  ),
  "/income": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.6 10c.4-.7 1.3-1.1 2.4-1.1 1.3 0 2.3.7 2.3 1.7 0 2.3-4.8 1-4.8 3.3 0 1 1 1.7 2.5 1.7 1.1 0 2-.4 2.4-1.1" />
    </>
  ),
  "/transfers": (
    <>
      <path d="M7 7h11M18 7l-3-3M18 7l-3 3" />
      <path d="M17 17H6M6 17l3 3M6 17l3-3" />
    </>
  ),
  "/weekly-rollup": (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="M7 15v-3M11 15V9M15 15v-5M19 15V7" />
    </>
  ),
  "/monthly-rollup": (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
      <path d="M4 10h16M8 3.5v4M16 3.5v4" />
    </>
  ),
  "/recurring-bills": (
    <>
      <path d="M4 8a8 8 0 0 1 13.7-2.5L20 8M20 4v4h-4" />
      <path d="M20 16a8 8 0 0 1-13.7 2.5L4 16M4 20v-4h4" />
    </>
  ),
  "/savings-goals": (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  "/net-worth": (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15l3-3 2.5 2L18 8" />
    </>
  ),
  "/semester-planner": (
    <>
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" />
      <path d="M5 16h13" />
    </>
  ),
  "/insights": <path d="M12 4l1.8 4.7L18.5 10l-4.7 1.3L12 16l-1.8-4.7L5.5 10l4.7-1.3L12 4Z" />,
  "/key-dates": (
    <>
      <path d="M6 4v16M6 5h11l-2 3 2 3H6" />
    </>
  ),
  "/settings": (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.13-1.3l2-1.55-2-3.46-2.36.95A7 7 0 0 0 15 4.6L14.6 2h-4L10 4.6a7 7 0 0 0-1.5.9L6.13 4.6l-2 3.46 2 1.55A7 7 0 0 0 5 12c0 .44.05.87.13 1.3l-2 1.55 2 3.46 2.36-.95c.45.37.96.68 1.51.9L10 22h4l.4-2.6c.55-.22 1.06-.53 1.51-.9l2.36.95 2-3.46-2-1.55c.08-.43.13-.86.13-1.3Z" />
    </>
  ),
  "/import": (
    <>
      <path d="M12 3v12M12 15l-4-4M12 15l4-4" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </>
  ),
  "/audit-log": (
    <>
      <path d="M8 3v4M16 3v4M4 8h16" />
      <rect x="4" y="5" width="16" height="16" rx="2.5" />
      <path d="M8 13h8M8 17h5" />
    </>
  ),
};

export function NavIcon({ href, size = 19 }: { href: string; size?: number }) {
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
    >
      {P[href] ?? P["/"]}
    </svg>
  );
}
