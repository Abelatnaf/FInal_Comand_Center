"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding, skipOnboarding } from "@/app/(app)/welcome/actions";
import { fromMinor } from "@/lib/money";
import type { Category } from "@/lib/categories";

type Account = { id: string; name: string; kind: string; opening_balance_minor: number };

const KIND_HINT: Record<string, string> = {
  checking: "Everyday spending account",
  savings: "Where money sits",
  cash: "Wallet, envelope, under the mattress",
};

const STEPS = ["You", "Term", "Accounts", "Budgets"] as const;

/** Rough US academic calendar, so the common case is confirm-and-continue. */
function suggestTerm() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (month >= 7 && month <= 11) {
    return { name: `Fall ${year}`, startsOn: `${year}-08-25`, endsOn: `${year}-12-15` };
  }
  if (month <= 4) {
    return { name: `Spring ${year}`, startsOn: `${year}-01-15`, endsOn: `${year}-05-10` };
  }
  return { name: `Summer ${year}`, startsOn: `${year}-06-01`, endsOn: `${year}-08-15` };
}

export function OnboardingWizard({
  accounts,
  categories,
  displayName,
}: {
  accounts: Account[];
  categories: Category[];
  displayName: string;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(displayName);
  const [accountState, setAccountState] = useState(() =>
    accounts.map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      balance: a.opening_balance_minor ? fromMinor(BigInt(a.opening_balance_minor)) : "",
    }))
  );
  const [budgetState, setBudgetState] = useState<Record<string, string>>({});
  const [term, setTerm] = useState(suggestTerm());
  const [skipTerm, setSkipTerm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  function finish() {
    startTransition(async () => {
      const res = await completeOnboarding({
        displayName: name,
        term: skipTerm ? null : term,
        accounts: accountState.map((a) => ({ id: a.id, name: a.name, balance: a.balance })),
        budgets: Object.entries(budgetState).map(([id, amount]) => ({ id, amount })),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push("/");
    });
  }

  function skip() {
    startTransition(async () => {
      await skipOnboarding();
      router.push("/");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="section-label mb-1">
          Step {step + 1} of {STEPS.length}
        </p>
        <h1 className="page-title">
          {step === 0 && "Welcome"}
          {step === 1 && "When's your term?"}
          {step === 2 && "Your accounts"}
          {step === 3 && "Set a budget or two"}
        </h1>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {step === 0 && (
        <div className="card row flex flex-col gap-3">
          <p className="text-[15px] text-text">
            This works out whether your money lasts to the end of the semester — not just what you spent
            this month. Takes about a minute to set up, and you can change any of it later.
          </p>
          <label className="section-label" htmlFor="display_name">
            What should we call you?
          </label>
          <input
            id="display_name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional"
          />
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <div className="row flex flex-col gap-3">
            <p className="text-[14px] text-muted">
              Your money has to last until the term ends. Give it those dates and the home screen becomes
              &ldquo;you have $X and Y days to go&rdquo;.
            </p>
            <input
              className="input"
              value={term.name}
              onChange={(e) => setTerm({ ...term, name: e.target.value })}
              placeholder="Fall 2026"
              aria-label="Term name"
              disabled={skipTerm}
            />
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="section-label block mb-1">Starts</span>
                <input
                  type="date"
                  className="input"
                  value={term.startsOn}
                  onChange={(e) => setTerm({ ...term, startsOn: e.target.value })}
                  disabled={skipTerm}
                />
              </label>
              <label className="flex-1">
                <span className="section-label block mb-1">Ends</span>
                <input
                  type="date"
                  className="input"
                  value={term.endsOn}
                  onChange={(e) => setTerm({ ...term, endsOn: e.target.value })}
                  disabled={skipTerm}
                />
              </label>
            </div>
            <p className="text-[12px] text-faint">
              Pre-filled with a typical semester — change them to match your school.
            </p>
            <label className="flex items-center gap-2.5 text-[15px] text-text">
              <input type="checkbox" checked={skipTerm} onChange={(e) => setSkipTerm(e.target.checked)} />
              I&rsquo;m not in a term right now
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <div className="row">
            <p className="text-[14px] text-muted">
              We started you off with three. Rename them to match your real accounts and put in what&rsquo;s
              in each one right now — that&rsquo;s what makes your balances correct. You can add credit
              cards later in Settings.
            </p>
          </div>
          {accountState.map((a, i) => (
            <div key={a.id} className="row flex flex-col gap-2">
              <input
                className="input"
                value={a.name}
                onChange={(e) =>
                  setAccountState((prev) =>
                    prev.map((x, j) => (i === j ? { ...x, name: e.target.value } : x))
                  )
                }
                aria-label="Account name"
              />
              <input
                className="input num"
                inputMode="decimal"
                value={a.balance}
                onChange={(e) =>
                  setAccountState((prev) =>
                    prev.map((x, j) => (i === j ? { ...x, balance: e.target.value } : x))
                  )
                }
                placeholder="Current balance"
                aria-label="Current balance"
              />
              <p className="text-[12px] text-faint">{KIND_HINT[a.kind] ?? ""}</p>
            </div>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <div className="row">
            <p className="text-[14px] text-muted">
              A budget is a ceiling for the whole term you want to notice crossing. Fill in the ones you care
              about and leave the rest blank — most people start with two or three.
            </p>
          </div>
          {categories.slice(0, 8).map((c) => (
            <div key={c.id} className="row flex items-center gap-3">
              <span className="text-[15px] flex-1">
                {c.icon} {c.name}
              </span>
              <input
                className="input num w-[120px]"
                inputMode="decimal"
                value={budgetState[c.id] ?? ""}
                onChange={(e) => setBudgetState((prev) => ({ ...prev, [c.id]: e.target.value }))}
                placeholder="—"
                aria-label={`Monthly budget for ${c.name}`}
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-alarm text-[14px]">{error}</p>}

      <div className="flex gap-2">
        {step > 0 && (
          <button type="button" className="btn flex-1" onClick={() => setStep((s) => s - 1)}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn btn-primary flex-1" onClick={() => setStep((s) => s + 1)}>
            Next
          </button>
        ) : (
          <button type="button" className="btn btn-primary flex-1" disabled={busy} onClick={finish}>
            {busy ? "Saving…" : "Start tracking"}
          </button>
        )}
      </div>

      <button type="button" className="text-muted text-[14px]" disabled={busy} onClick={skip}>
        Skip setup
      </button>
    </div>
  );
}
