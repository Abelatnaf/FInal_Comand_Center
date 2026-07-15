"use client";

import { useState } from "react";
import { Glass } from "@/components/glass/Glass";
import { fmtUsd } from "@/lib/format";

function monthsToPayoff(balance: number, monthlyPayment: number, aprPct: number | null): number | null {
  if (monthlyPayment <= 0 || balance <= 0) return null;
  const r = (aprPct ?? 0) / 100 / 12;
  if (r === 0) return Math.ceil(balance / monthlyPayment);
  if (monthlyPayment <= balance * r) return null; // payment doesn't even cover monthly interest
  return Math.ceil(-Math.log(1 - (r * balance) / monthlyPayment) / Math.log(1 + r));
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function PayoffCalculator({ balance, interestRatePct }: { balance: number; interestRatePct: number | null }) {
  const [payment, setPayment] = useState(String(Math.max(25, Math.round(balance / 24))));
  const monthlyPayment = parseFloat(payment) || 0;
  const months = monthsToPayoff(balance, monthlyPayment, interestRatePct);
  const totalPaid = months !== null ? monthlyPayment * months : null;
  const totalInterest = totalPaid !== null ? Math.max(0, totalPaid - balance) : null;

  return (
    <Glass className="p-5 mb-6">
      <div className="ios-headline mb-1">Payoff Planner</div>
      <p className="stat-label mb-4">
        {interestRatePct != null
          ? `Estimated at ${interestRatePct}% APR — set in Settings → Financial → Accounts.`
          : "No interest rate set — this is a simple linear estimate. Add an APR in Settings → Financial → Accounts for a real amortization."}
      </p>

      <label className="stat-label block mb-1.5">Monthly Payment</label>
      <input
        type="number"
        step="0.01"
        min="0"
        value={payment}
        onChange={(e) => setPayment(e.target.value)}
        className="input w-full num mb-4"
      />

      {months === null ? (
        <p className="text-[14px] text-text-dim">
          At {fmtUsd(monthlyPayment)}/month this balance won&apos;t shrink — increase the payment above the monthly interest.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="stat-label">Paid Off By</div>
            <div className="text-[18px] font-semibold num mt-0.5">{addMonths(new Date(), months)}</div>
            <div className="stat-label num mt-0.5">{months} month{months === 1 ? "" : "s"}</div>
          </div>
          <div>
            <div className="stat-label">Total Interest</div>
            <div className="text-[18px] font-semibold num mt-0.5">{fmtUsd(totalInterest ?? 0)}</div>
            <div className="stat-label num mt-0.5">{fmtUsd(totalPaid ?? 0)} total paid</div>
          </div>
        </div>
      )}
    </Glass>
  );
}
