import { formatMoney, type Currency } from "@/lib/money";

export function Amount({
  minor,
  currency,
  className = "",
}: {
  minor: bigint;
  currency: Currency;
  className?: string;
}) {
  return <span className={`num ${className}`}>{formatMoney(minor, currency)}</span>;
}
