"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { dismissOnboarding } from "@/app/(app)/onboarding-actions";

const STEPS = [
  {
    title: "Welcome to Command Deck",
    body: "This is your money, in one place. Log every expense and paycheck, and everything else — balances, budgets, rollups, net worth — computes itself from that history.",
  },
  {
    title: "Set up your accounts and currencies",
    body: "You start with Checking, Savings, and Cash at $0. Head to Settings → Financial to rename them, set real starting balances, add credit cards or loans as liabilities, and add any currency besides USD you spend in.",
  },
  {
    title: "Log your first entry",
    body: "Use the + button (bottom-right) any time to add an expense, income, or transfer in a few taps. Everything else — Transactions, Insights, rollups — fills in from there.",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function finish() {
    startTransition(async () => {
      await dismissOnboarding();
    });
    setOpen(false);
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="material w-full max-w-sm rounded-[16px] p-6">
        <div className="flex gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-[var(--blue)]" : "bg-[var(--fill-tertiary)]"}`} />
          ))}
        </div>

        <div className="ios-title2 mb-2">{STEPS[step].title}</div>
        <p className="ios-body text-text-dim mb-6">{STEPS[step].body}</p>

        <div className="flex items-center justify-between gap-3">
          <button onClick={finish} disabled={pending} className="text-text-dim text-[13px]">
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="btn !py-2 !px-4 text-sm">
                Back
              </button>
            )}
            {isLast ? (
              <Link href="/settings" onClick={finish} className="btn btn-primary !py-2 !px-4 text-sm">
                Get Started
              </Link>
            ) : (
              <button onClick={() => setStep((s) => s + 1)} className="btn btn-primary !py-2 !px-4 text-sm">
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
