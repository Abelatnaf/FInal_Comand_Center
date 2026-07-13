import Link from "next/link";
import { AccountCard, type AccountKind, type CardFinish } from "./AccountCard";

const FINISHES: CardFinish[] = ["titanium", "steel", "gold", "rosegold"];
const CARD_HEIGHT = 170;
const PEEK_OFFSET = 64;

export type StackAccount = {
  id: string;
  name: string;
  balance: number;
  kind: AccountKind;
};

export function CardStack({ accounts }: { accounts: StackAccount[] }) {
  if (accounts.length === 0) {
    return (
      <Link
        href="/settings"
        className="wallet-card finish-titanium flex items-center justify-center px-5 text-center active:scale-[0.98] transition-transform"
        style={{ height: CARD_HEIGHT }}
      >
        <span className="ios-subhead opacity-80">Add your first account in Settings →</span>
      </Link>
    );
  }

  const containerHeight = CARD_HEIGHT + (accounts.length - 1) * PEEK_OFFSET;

  return (
    <div className="relative" style={{ height: containerHeight }}>
      {accounts.map((a, i) => (
        <Link
          key={a.id}
          href={`/accounts/${a.id}`}
          className="absolute left-0 right-0 block active:scale-[0.98] transition-transform"
          style={{ top: i * PEEK_OFFSET, height: CARD_HEIGHT, zIndex: accounts.length - i }}
        >
          <AccountCard
            id={a.id}
            name={a.name}
            balance={a.balance}
            kind={a.kind}
            finish={FINISHES[i % FINISHES.length]}
            variant="peek"
          />
        </Link>
      ))}
    </div>
  );
}
