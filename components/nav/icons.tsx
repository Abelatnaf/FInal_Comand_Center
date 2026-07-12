type IconProps = { className?: string; size?: number };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}

export function HomeIcon({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3.5 11.2 12 4l8.5 7.2" />
      <path d="M5.5 9.8V19a1 1 0 0 0 1 1H10v-5.2a2 2 0 0 1 4 0V20h3.5a1 1 0 0 0 1-1V9.8" />
    </svg>
  );
}

export function ListIcon({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="4.5" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17" r="1.1" fill="currentColor" stroke="none" />
      <path d="M9 7h11M9 12h11M9 17h11" />
    </svg>
  );
}

export function IncomeIcon({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.4v9.2" />
      <path d="M14.4 9.4c-.5-.7-1.4-1.1-2.4-1.1-1.4 0-2.4.7-2.4 1.8 0 2.5 5 1 5 3.5 0 1.1-1.1 1.9-2.6 1.9-1.1 0-2-.4-2.5-1.2" />
    </svg>
  );
}

export function MoreIcon({ className, size = 24 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="8.4" cy="12" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="15.6" cy="12" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  );
}
