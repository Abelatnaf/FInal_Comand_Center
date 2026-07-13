import { fmtUsd } from "@/lib/format";

export type CardFinish = "titanium" | "steel" | "gold" | "rosegold";
export type AccountKind = "asset" | "liability";

export function maskedAccountId(id: string) {
  const digits = id.replace(/[^0-9a-zA-Z]/g, "").slice(-4).toUpperCase();
  return `•••• ${digits}`;
}

export function AccountCard({
  id,
  name,
  balance,
  kind,
  finish,
  variant = "peek",
}: {
  id: string;
  name: string;
  balance: number;
  kind: AccountKind;
  finish: CardFinish;
  variant?: "peek" | "expanded";
}) {
  const isLiability = kind === "liability";
  const finishClass = isLiability ? "finish-graphite" : `finish-${finish}`;
  const signedBalance = `${isLiability ? "−" : ""}${fmtUsd(balance)}`;

  return (
    <div className={`wallet-card ${finishClass} h-full w-full px-5 py-[18px] flex flex-col justify-between`}>
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-75 truncate">
        {variant === "expanded" ? `${name} · ${maskedAccountId(id)}` : name}
      </div>

      {variant === "expanded" ? (
        <div className="text-[32px] font-bold num tracking-tight">{signedBalance}</div>
      ) : (
        <div />
      )}

      <div className="flex items-center justify-between text-[12px] font-semibold opacity-70">
        {variant === "expanded" ? (
          <>
            <span>{isLiability ? "Outstanding balance" : "Available balance"}</span>
            <span>{isLiability ? "Liability" : "Asset"}</span>
          </>
        ) : (
          <>
            <span className="num">{maskedAccountId(id)}</span>
            <span className="num">{signedBalance}</span>
          </>
        )}
      </div>
    </div>
  );
}
