"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createTransaction } from "@/app/(app)/add/actions";
import { Keypad } from "@/components/money/Keypad";
import { CurrencyToggle } from "@/components/money/CurrencyToggle";
import { toMinor, convertToUsdMinor, formatMoney, type Currency } from "@/lib/money";
import { sortByUsage, type Direction } from "@/lib/categories";
import { todayIso } from "@/lib/date";
import { enqueueTransaction } from "@/lib/offline/queue";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";

type Payer = { id: string; key: string; label: string; is_default: boolean };
type Account = { id: string; name: string; currency: Currency };
type Obligation = { obligation_id: string; title: string; payer_id: string };

export function AddForm({
  payers,
  accounts,
  fxRate,
  obligations,
  lastAccountByCurrency,
  categoryUsage,
  defaultCurrency,
  initialObligationId,
  initialPayerId,
}: {
  payers: Payer[];
  accounts: Account[];
  fxRate: { etb_per_usd: number; effective_on: string } | null;
  obligations: Obligation[];
  lastAccountByCurrency: Record<Currency, string | null>;
  categoryUsage: { in: Record<string, number>; out: Record<string, number> };
  defaultCurrency: Currency;
  initialObligationId?: string;
  initialPayerId?: string;
}) {
  const isRecordingPayment = Boolean(initialObligationId);
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const [amountRaw, setAmountRaw] = useState("");
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [direction, setDirection] = useState<Direction>("out");
  const [category, setCategory] = useState<string>(sortByUsage("out", categoryUsage.out)[0]);
  const [showMore, setShowMore] = useState(isRecordingPayment);
  const [occurredOn, setOccurredOn] = useState(todayIso());
  const [note, setNote] = useState("");
  const [obligationId, setObligationId] = useState(initialObligationId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountsForCurrency = useMemo(() => accounts.filter((a) => a.currency === currency), [accounts, currency]);
  const [accountId, setAccountId] = useState<string>(
    lastAccountByCurrency[defaultCurrency] ?? accounts.find((a) => a.currency === defaultCurrency)?.id ?? ""
  );
  const defaultPayer = payers.find((p) => p.id === initialPayerId) ?? payers.find((p) => p.is_default) ?? payers[0];
  const [payerId, setPayerId] = useState<string>(defaultPayer?.id ?? "");

  function handleCurrency(next: Currency) {
    setCurrency(next);
    const stillValid = accounts.some((a) => a.id === accountId && a.currency === next);
    if (!stillValid) {
      setAccountId(lastAccountByCurrency[next] ?? accounts.find((a) => a.currency === next)?.id ?? "");
    }
  }

  function handleDirection(next: Direction) {
    setDirection(next);
    setCategory(sortByUsage(next, categoryUsage[next])[0]);
  }

  function handleKey(key: string) {
    if (key === "del") {
      setAmountRaw((s) => s.slice(0, -1));
      return;
    }
    if (key === "." && amountRaw.includes(".")) return;
    if (amountRaw.replace(".", "").length >= 9) return; // absurd-amount guard, not a real limit
    setAmountRaw((s) => s + key);
  }

  let minor: bigint | null = null;
  try {
    minor = amountRaw === "" ? null : toMinor(amountRaw);
  } catch {
    minor = null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    if (!navigator.onLine) {
      await enqueueTransaction(queueFieldsFrom(formData));
      router.push("/");
      return;
    }

    setPending(true);
    try {
      const result = await createTransaction(undefined, formData);
      setPending(false);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push("/");
    } catch {
      // A real network failure mid-request (was online, connection dropped
      // right as Save was tapped) -- queue it rather than losing the entry.
      setPending(false);
      await enqueueTransaction(queueFieldsFrom(formData));
      router.push("/");
    }
  }

  const relevantObligations = obligations.filter((o) => o.payer_id === payerId);
  const categories = sortByUsage(direction, categoryUsage[direction]);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="text-center py-4">
        <div className="hero-figure num">{amountRaw === "" ? "0" : amountRaw}</div>
        {minor !== null && currency === "ETB" && fxRate && (
          <p className="estimate num text-[15px] mt-1">
            ~{formatMoney(convertToUsdMinor(minor, "ETB", fxRate.etb_per_usd), "USD")}
          </p>
        )}
        {minor !== null && currency === "ETB" && !fxRate && (
          <p className="text-alarm text-[13px] mt-1">Set today&rsquo;s rate in Settings first.</p>
        )}
      </div>

      <Keypad onKey={handleKey} />

      <div className="flex items-center justify-between gap-3">
        <CurrencyToggle value={currency} onChange={handleCurrency} />
        <div className="segmented" role="group" aria-label="Direction">
          <button type="button" data-active={direction === "out"} onClick={() => handleDirection("out")}>
            Out
          </button>
          <button type="button" data-active={direction === "in"} onClick={() => handleDirection("in")}>
            In
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <button key={c} type="button" className="chip" data-active={category === c} onClick={() => setCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="text-muted text-[14px] text-left"
        onClick={() => setShowMore((v) => !v)}
      >
        {showMore ? "Less ⌃" : "More ⌄"}
      </button>

      {showMore && (
        <div className="card">
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="occurred_on">
              Date
            </label>
            <input
              id="occurred_on"
              type="date"
              className="input"
              value={occurredOn}
              onChange={(e) => setOccurredOn(e.target.value)}
            />
          </div>
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="account">
              Account
            </label>
            <select id="account" className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accountsForCurrency.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="payer">
              Who&rsquo;s this for
            </label>
            <select id="payer" className="input" value={payerId} onChange={(e) => setPayerId(e.target.value)}>
              {payers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          {relevantObligations.length > 0 && direction === "out" && (
            <div className="row">
              <label className="section-label block mb-1.5" htmlFor="obligation">
                Applies to a bill
              </label>
              <select
                id="obligation"
                className="input"
                value={obligationId}
                onChange={(e) => setObligationId(e.target.value)}
              >
                <option value="">None</option>
                {relevantObligations.map((o) => (
                  <option key={o.obligation_id} value={o.obligation_id}>
                    {o.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="note">
              Note
            </label>
            <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      )}

      <input type="hidden" name="amount_minor" value={minor?.toString() ?? ""} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="category" value={category ?? ""} />
      <input type="hidden" name="occurred_on" value={occurredOn} />
      <input type="hidden" name="account_id" value={accountId} />
      <input type="hidden" name="payer_id" value={payerId} />
      <input type="hidden" name="note" value={note} />
      <input type="hidden" name="obligation_id" value={direction === "out" ? obligationId : ""} />

      {error && <p className="text-alarm text-[15px]">{error}</p>}

      <button type="submit" disabled={pending || minor === null} className="btn btn-primary w-full">
        {pending ? "Saving…" : isOnline ? "Save" : "Save (will sync later)"}
      </button>
    </form>
  );
}

function queueFieldsFrom(formData: FormData) {
  const get = (name: string) => String(formData.get(name) ?? "");
  return {
    amount_minor: get("amount_minor"),
    currency: get("currency"),
    direction: get("direction"),
    category: get("category"),
    occurred_on: get("occurred_on"),
    account_id: get("account_id"),
    payer_id: get("payer_id"),
    note: get("note"),
    obligation_id: get("obligation_id"),
  };
}
