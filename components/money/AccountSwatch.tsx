const TONES = ["emerald", "indigo", "amber", "rose", "slate"] as const;

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Purely decorative, assigned by position -- not stored, so adding or
 * reordering accounts costs nothing and never needs a migration.
 */
export function AccountSwatch({ name, index }: { name: string; index: number }) {
  const tone = TONES[index % TONES.length];
  return (
    <span className="account-swatch" data-tone={tone} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
