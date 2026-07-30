import { formatMoney, type Currency } from "@/lib/money";

export function Amount({
  minor,
  currency,
  className = "",
  tone,
}: {
  minor: bigint;
  currency: Currency;
  className?: string;
  tone?: "urgent" | "alarm";
}) {
  return (
    <span className={`num ${className}`} data-tone={tone}>
      {formatMoney(minor, currency)}
    </span>
  );
}
