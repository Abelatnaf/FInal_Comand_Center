import { formatMoney } from "@/lib/money";

export function Amount({
  minor,
  className = "",
  tone,
}: {
  minor: bigint;
  className?: string;
  tone?: "urgent" | "alarm";
}) {
  return (
    <span className={`num ${className}`} data-tone={tone}>
      {formatMoney(minor)}
    </span>
  );
}
