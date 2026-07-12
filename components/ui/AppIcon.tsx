type Glyph =
  | "bank"
  | "wallet"
  | "cash"
  | "chart"
  | "bag"
  | "home"
  | "cart"
  | "car"
  | "book"
  | "heart"
  | "gift"
  | "sparkle"
  | "calendar"
  | "target";

const PATHS: Record<Glyph, React.ReactNode> = {
  bank: (
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8M9 10v8M15 10v8M19 10v8M3.5 20h17" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  cash: (
    <>
      <rect x="3" y="6.5" width="18" height="11" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15l3-3 2.5 2L18 8" />
    </>
  ),
  bag: (
    <>
      <path d="M6 8h12l-1 11H7L6 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 11.2 12 4l8.5 7.2" />
      <path d="M5.5 9.8V19a1 1 0 0 0 1 1H10v-5.2a2 2 0 0 1 4 0V20h3.5a1 1 0 0 0 1-1V9.8" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="19" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="19" r="1.3" fill="currentColor" stroke="none" />
      <path d="M3 4h2l2.2 11h10L20 7H6.5" />
    </>
  ),
  car: (
    <>
      <path d="M4 16v-3l2-5h12l2 5v3" />
      <path d="M3.5 16h17" />
      <circle cx="8" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16" cy="17.5" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" />
      <path d="M5 16h13" />
    </>
  ),
  heart: <path d="M12 20s-7-4.6-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5C19 15.4 12 20 12 20Z" />,
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1.5" />
      <path d="M4 13h16M12 9v11" />
      <path d="M12 9c-1-3-5-3-5-.8C7 9 12 9 12 9Zm0 0c1-3 5-3 5-.8C17 9 12 9 12 9Z" />
    </>
  ),
  sparkle: <path d="M12 4l1.8 4.7L18.5 10l-4.7 1.3L12 16l-1.8-4.7L5.5 10l4.7-1.3L12 4Z" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
      <path d="M4 10h16M8 3.5v4M16 3.5v4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
};

export function AppIcon({
  glyph,
  color,
  size = 34,
}: {
  glyph: Glyph;
  color: string;
  size?: number;
}) {
  return (
    <div className="app-icon" style={{ background: color, width: size, height: size }}>
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {PATHS[glyph]}
      </svg>
    </div>
  );
}
