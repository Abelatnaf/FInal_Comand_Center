import { Glass } from "@/components/glass/Glass";
import { StatCard } from "@/components/glass/StatCard";

// Static shell matching command-deck-mono.html. Wired to live Supabase
// queries (stats, budget-vs-actual, category totals, Quick Add) in Phase 3.
export default function CommandDeckPage() {
  return (
    <div>
      <div className="eyebrow mb-3">
        <span className="dot" />
        LIVE · CADET WEEK —
      </div>
      <h1 className="font-display text-[32px] md:text-[42px] font-semibold mb-1.5">
        Command Deck
      </h1>
      <p className="text-text-dim text-[15px] mb-10">Fall 2026</p>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <Glass className="md:col-span-8 p-8 flex flex-col justify-between min-h-[220px]">
          <div>
            <div className="stat-label mb-3.5">Current Balance</div>
            <div className="hero-value">$0.00</div>
          </div>
          <div className="flex flex-wrap gap-7 mt-6 num text-[13px] text-text-dim">
            <div>
              FX RATE <b className="text-silver font-medium">—</b>
            </div>
            <div>
              MONTHLY BURN <b className="text-silver font-medium">$0.00</b>
            </div>
            <div>
              SEMESTER STATUS <b className="text-silver font-medium">—</b>
            </div>
          </div>
        </Glass>

        <StatCard
          label="This month income"
          value="$0.00"
          delta="—"
          badge="↑ NET POSITIVE"
          className="md:col-span-4"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
        <StatCard label="This month spent" value="$0.00" size="small" className="md:col-span-3" />
        <StatCard
          label="Total saved (goals)"
          value="$0.00"
          size="small"
          className="md:col-span-3"
        />
        <Glass className="md:col-span-6 p-6 flex items-center gap-5">
          <div className="relative w-[88px] h-[88px] shrink-0">
            <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
              <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
              <circle
                cx="44"
                cy="44"
                r="38"
                fill="none"
                stroke="url(#ring-gradient)"
                strokeWidth="8"
                strokeDasharray="238.7"
                strokeDashoffset="238.7"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4a4a52" />
                  <stop offset="100%" stopColor="#eceaf0" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center num text-base font-semibold text-silver">
              0%
            </div>
          </div>
          <div>
            <div className="stat-label mb-1">Discretionary spend</div>
            <div className="text-text-faint text-[13px] num">$0.00 discretionary this month</div>
          </div>
        </Glass>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Glass className="p-6">
          <div className="font-display text-lg font-medium mb-4">Budget vs Actual — This Month</div>
          <BudgetPlaceholderTable />
        </Glass>
        <Glass className="p-6">
          <div className="font-display text-lg font-medium mb-4">Life-to-Date Spend by Category</div>
          <CategoryPlaceholderTable />
        </Glass>
      </div>

      <Glass className="p-7 md:p-8">
        <div className="flex justify-between items-baseline mb-5 flex-wrap gap-2">
          <div className="font-display text-lg font-medium">Cadet Week Progress</div>
          <div className="eyebrow">
            WEEK <b className="text-text">—</b> OF <b className="text-text">—</b>
          </div>
        </div>
        <div className="liquid-track">
          <div className="liquid-fill" style={{ width: "0%" }} />
        </div>
        <div className="flex justify-between mt-2.5 num text-[10px] text-text-faint">
          <span>MATRICULATION</span>
          <span>RAT ORIENTATION</span>
          <span>THANKSGIVING FURLOUGH</span>
          <span>FALL FINALS</span>
        </div>
      </Glass>
    </div>
  );
}

const CATEGORIES = [
  "Mess Hall/Dining",
  "Uniform/Gear/Laundry",
  "Personal Care",
  "Weekend/Leave/Travel",
  "Academic/Books",
  "Transportation",
  "Health/Medical",
  "Tech & Subscriptions",
  "Gifts & Occasions",
  "Other",
];

function BudgetPlaceholderTable() {
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="text-text-faint text-left">
          <th className="font-normal pb-2">Category</th>
          <th className="font-normal pb-2 text-right">Budget</th>
          <th className="font-normal pb-2 text-right">Actual</th>
        </tr>
      </thead>
      <tbody className="num">
        {CATEGORIES.map((c) => (
          <tr key={c} className="border-t border-white/[0.05]">
            <td className="py-2 text-text-dim font-sans">{c}</td>
            <td className="py-2 text-right">$0</td>
            <td className="py-2 text-right">$0</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CategoryPlaceholderTable() {
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="text-text-faint text-left">
          <th className="font-normal pb-2">Category</th>
          <th className="font-normal pb-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody className="num">
        {CATEGORIES.map((c) => (
          <tr key={c} className="border-t border-white/[0.05]">
            <td className="py-2 text-text-dim font-sans">{c}</td>
            <td className="py-2 text-right">$0</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
