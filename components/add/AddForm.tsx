"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createTransaction } from "@/app/(app)/add/actions";
import { Keypad } from "@/components/money/Keypad";
import { CurrencyToggle } from "@/components/money/CurrencyToggle";
import { toMinor, fromMinor, convertToUsdMinor, formatMoney, type Currency } from "@/lib/money";
import { sortByUsage, kindForDirection, type Category, type Direction } from "@/lib/categories";
import { todayIso } from "@/lib/date";
import { enqueueTransaction } from "@/lib/offline/queue";
import { useOnlineStatus } from "@/lib/offline/useOnlineStatus";
import { HScroll } from "@/components/ui/HScroll";

type Payer = { id: string; key: string; label: string; is_default: boolean };
type Account = { id: string; name: string; currency: Currency };
type Obligation = { obligation_id: string; title: string; payer_id: string };
type LastEntry = {
  amount_minor: number;
  currency: string;
  direction: string;
  category_id: string | null;
  account_id: string;
  payer_id: string;
  note: string | null;
};

export function AddForm({
  payers,
  accounts,
  categories,
  fxRate,
  obligations,
  lastAccountByCurrency,
  categoryUsage,
  defaultCurrency,
  lastEntry,
  initialObligationId,
  initialAmount,
  initialPayerId,
}: {
  payers: Payer[];
  accounts: Account[];
  categories: Category[];
  fxRate: { etb_per_usd: number; effective_on: string } | null;
  obligations: Obligation[];
  lastAccountByCurrency: Record<Currency, string | null>;
  /** Keyed by category id, counted over the last 90 days. */
  categoryUsage: Record<string, number>;
  defaultCurrency: Currency;
  lastEntry: LastEntry | null;
  initialObligationId?: string;
  /** Prefilled from a bill's "Pay remaining" link, as a decimal string. */
  initialAmount?: string;
  initialPayerId?: string;
}) {
  const isRecordingPayment = Boolean(initialObligationId);
  const router = useRouter();
  const isOnline = useOnlineStatus();

  // A "Pay remaining" link carries the exact figure; anything else starts blank.
  const [amountRaw, setAmountRaw] = useState(initialAmount ?? "");
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [direction, setDirection] = useState<Direction>("out");

  // Most-used first, so the likely pick is already in reach without scrolling.
  const categoriesFor = (d: Direction) =>
    sortByUsage(
      categories.filter((c) => c.kind === kindForDirection(d) && !c.is_archived),
      categoryUsage
    );

  const [categoryId, setCategoryId] = useState<string>(categoriesFor("out")[0]?.id ?? "");
  const [showMore, setShowMore] = useState(isRecordingPayment);
  const [occurredOn, setOccurredOn] = useState(todayIso());
  const [note, setNote] = useState("");
  const [obligationId, setObligationId] = useState(initialObligationId ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasReceipt, setHasReceipt] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

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
    setCategoryId(categoriesFor(next)[0]?.id ?? "");
  }

  // Reuses the last entry's shape, not its date -- "repeat" means logging the
  // same kind of thing again today, not re-dating an old entry. The amount is
  // prefilled too, since a repeated expense is usually the same price; it's
  // still fully editable on the keypad before saving.
  function handleRepeatLast() {
    if (!lastEntry) return;
    const repeatCurrency = lastEntry.currency as Currency;
    const repeatDirection = lastEntry.direction as Direction;

    setCurrency(repeatCurrency);
    setDirection(repeatDirection);
    // Only reuse the category if it still exists and matches the direction --
    // it may since have been deleted or archived.
    const repeatCategory = categoriesFor(repeatDirection).find((c) => c.id === lastEntry.category_id);
    setCategoryId(repeatCategory?.id ?? categoriesFor(repeatDirection)[0]?.id ?? "");
    setNote(lastEntry.note ?? "");
    setPayerId(lastEntry.payer_id);
    setOccurredOn(todayIso());
    setObligationId("");
    setAmountRaw(fromMinor(BigInt(lastEntry.amount_minor)));

    // Only reuse the account if it's still live and matches the currency --
    // an archived or deleted account would otherwise submit a dead id.
    const account = accounts.find((a) => a.id === lastEntry.account_id && a.currency === repeatCurrency);
    setAccountId(account?.id ?? lastAccountByCurrency[repeatCurrency] ?? accounts.find((a) => a.currency === repeatCurrency)?.id ?? "");
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
      if (result?.duplicateWarning) {
        // Not an error -- an identical entry already exists today. Surface it
        // and let the next submit go through with the confirm flag.
        setDuplicateWarning(true);
        return;
      }
      if (result?.error) {
        setError(result.error);
        return;
      }
      // The entry saved but its receipt didn't. Stay put and say so rather than
      // navigating away as if everything worked.
      if (result?.receiptError) {
        setError(`Saved, but the receipt didn't upload: ${result.receiptError}`);
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
  const visibleCategories = categoriesFor(direction);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="confirm_duplicate" value={duplicateWarning ? "true" : "false"} />
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

      {/* One scrolling row instead of three wrapped rows -- the single biggest
          density win on this screen, and "most-used first" already puts the
          likely pick within reach without scrolling. */}
      <HScroll className="-mx-4 px-4">
        <div className="flex gap-2 w-max">
          {visibleCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              data-active={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
            >
              <span aria-hidden>{c.icon}</span>
              {c.name}
            </button>
          ))}
          {visibleCategories.length === 0 && (
            <span className="text-muted text-[14px] py-2">
              No {direction === "out" ? "spending" : "income"} categories yet — add one in Settings.
            </span>
          )}
        </div>
      </HScroll>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-muted text-[14px] text-left"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? "Less ⌃" : "More ⌄"}
        </button>
        {lastEntry && !isRecordingPayment && (
          <button type="button" className="text-accent text-[14px] font-semibold" onClick={handleRepeatLast}>
            ↻ Repeat last
          </button>
        )}
      </div>

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
          <div className="row">
            <label className="section-label block mb-1.5" htmlFor="receipt">
              Receipt
            </label>
            <input
              id="receipt"
              name="receipt"
              type="file"
              accept="image/*,application/pdf"
              className="input"
              onChange={(e) => setHasReceipt(Boolean(e.target.files?.length))}
            />
            {hasReceipt && !isOnline && (
              <p className="text-urgent text-[13px] mt-1.5">
                Offline — the entry will sync, but the receipt won&rsquo;t. Re-attach it from the Ledger once
                you&rsquo;re back online.
              </p>
            )}
          </div>
        </div>
      )}

      <input type="hidden" name="amount_minor" value={minor?.toString() ?? ""} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="category_id" value={categoryId} />
      <input type="hidden" name="occurred_on" value={occurredOn} />
      <input type="hidden" name="account_id" value={accountId} />
      <input type="hidden" name="payer_id" value={payerId} />
      <input type="hidden" name="note" value={note} />
      <input type="hidden" name="obligation_id" value={direction === "out" ? obligationId : ""} />

      {error && <p className="text-alarm text-[15px]">{error}</p>}

      {duplicateWarning && (
        <div className="card row">
          <p className="text-[14px] text-urgent">
            You already logged this exact amount on this account today. Save again if it really happened
            twice.
          </p>
        </div>
      )}

      <button type="submit" disabled={pending || minor === null} className="btn btn-primary w-full">
        {pending
          ? "Saving…"
          : duplicateWarning
            ? "Save anyway"
            : isOnline
              ? "Save"
              : "Save (will sync later)"}
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
    category_id: get("category_id"),
    occurred_on: get("occurred_on"),
    account_id: get("account_id"),
    payer_id: get("payer_id"),
    note: get("note"),
    obligation_id: get("obligation_id"),
  };
}
