@AGENTS.md

# VMI Finance Command Center — Build Spec

## 0. What this is
A personal finance web app for Abel, replacing the `Expense_Tracker.xlsx` workbook (12-tab dual-currency cadet budget tracker). Full parity with the spreadsheet's logic, rebuilt as a real app: one source-of-truth `transactions`/`income` table, everything else (rollups, insights, net worth) is a computed view — not a manually-synced duplicate sheet.

Reference file for exact field names/logic: `Expense_Tracker.xlsx` (the 12-tab version — see Build Log below, there was an older 5-tab `VMI_Expense_Tracker.xlsx` draft that is superseded and not used).

## 1. Stack
- **Framework:** Next.js 16 (App Router), TypeScript — note: `middleware.ts` is deprecated in v16, renamed to `proxy.ts` (exported function name `proxy`, not `middleware`). See `AGENTS.md`.
- **Styling:** Tailwind CSS v4 (CSS-first config, no `tailwind.config.js`)
- **DB/Auth:** Supabase (Postgres + Supabase Auth, email/password, single user — no public signup)
- **Hosting:** Vercel, subdomain `finance.abelatnafu.com`
- **Charts:** Recharts (weekly/monthly trend lines, category breakdown donut, semester pacing bar)

## 2. Design system — Liquid Glass Monochrome

Locked in from design pass. Reference build: `command-deck-mono.html` — build the component library to match it exactly, don't reinterpret. (Uploaded to the repo build session; the exact CSS from it is transcribed verbatim into `app/globals.css`.)

**This is NOT generic glassmorphism.** Generic glassmorphism = one flat `backdrop-filter: blur()` on a translucent box. Liquid glass = layered depth (multiple blur/opacity tiers so panels sit at different "densities"), an ambient light source behind the page that glass panels refract (never put the glow on the card itself — put it on the page background), specular top-edge highlights (1px gradient line, not a uniform border), and grain texture so it doesn't read as a flat digital sheet.

### Color tokens
```css
--bg: #08080a;              /* near-black page base, never pure #000 */
--silver: #eceaf0;           /* the one accent — bright numbers, live states */
--silver-dim: #9c9aa5;       /* secondary emphasis, gradient stops */
--text: #f2f1f5;             /* primary text */
--text-dim: #86848f;         /* labels, secondary text */
--text-faint: #48474e;       /* captions, tick marks, disabled */
--glass-border: rgba(255,255,255,0.07);
--glass-border-strong: rgba(255,255,255,0.14);
```
No color-coding for good/bad (no green/red). Monochrome is the whole point — positive/negative and status signal has to come from typography weight, icon direction (↑/↓), and position, not hue. **Resolved in Phase 3**: icon direction + weight + border-strength, no hue. See Build Log.

### Typography
- **Display (headings, section titles):** Clash Display, weight 500–600 — loaded via Fontshare CDN (`api.fontshare.com`), not self-hosted (no font files were provided).
- **Body/UI (labels, copy):** General Sans, weight 400–600 — same Fontshare load.
- **All numbers, everywhere — no exceptions:** IBM Plex Mono, via `next/font/google`. Tabular figures, financial-terminal feel.

### Glass panel spec
```css
.glass{
  background: linear-gradient(155deg, rgba(255,255,255,0.055), rgba(255,255,255,0.012) 40%, rgba(255,255,255,0.025));
  backdrop-filter: blur(20px) saturate(120%);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
}
/* + specular top highlight (::before, 1px gradient line) */
/* + faint corner glow (::after, radial gradient, blurred) */
```
Page background carries 3 layered radial-gradient light sources (top-left, top-right faint, bottom-center) at low opacity. Grain overlay via SVG feTurbulence at ~5% opacity, `mix-blend-mode: overlay`, fixed position.

### Layout
Bento grid, not a uniform card grid — vary panel size by data importance (Current Balance is the largest panel on Command Deck, always). 12-column grid, gap 16px, 20px border-radius on all glass panels.

### Signature element
The Cadet Week progress bar is not a generic progress bar — it's light traveling through liquid glass toward Fall Finals, with an animated sweep highlight (`prefers-reduced-motion` disables the sweep). Reused in Semester Planner.

### What NOT to do
- No color-coded charts/badges (breaks monochrome discipline)
- No flat single-layer blur — always layer at least 2 glass densities per screen
- No pure black backgrounds, no pure white text
- Don't let hierarchy collapse to "everything is silver" — text-dim/text-faint need to be doing real work

## 3. Data model (Supabase tables)

**Ground truth is the real `Expense_Tracker.xlsx`, not this section verbatim** — see Build Log for the corrections that were made (no Payoneer balance account, categories carry a `monthly_budget`, exact enum values, etc.) before writing the actual migration in Phase 2.

```sql
-- Single settings row (fx rate, matriculation date, starting balances)
settings (
  id, fx_rate_etb_per_usd, matriculation_date,
  sofi_starting_balance, ally_starting_balance,
  cash_starting_balance, updated_at
)

categories (
  id, name, monthly_budget, sort_order
)

transactions (
  id, date, cadet_week int,          -- computed on insert from matriculation_date
  category text,                      -- CHECK constraint, 10-value enum, see §4
  description text,
  necessary_or_discretionary text,    -- 'Necessary' | 'Discretionary'
  is_recurring boolean,
  currency text,                      -- 'USD' | 'ETB'
  amount_original numeric,
  amount_usd numeric,                 -- computed at insert time using fx_rate at that date
  payment_method text,
  notes text
)

income (
  id, date, cadet_week int, source text,
  currency text, amount_original numeric, amount_usd numeric, notes text
)

recurring_bills (
  id, name, category, monthly_cost_usd, billing_day, payment_method, active boolean
)

savings_goals (
  id, name, target_amount_usd, target_date, saved_so_far_usd
  -- remaining, % complete, monthly $ needed = computed, not stored
)

net_worth_snapshots (
  id, snapshot_date, sofi_actual, ally_actual, cash_actual, notes
  -- total_actual, computed_balance, variance = computed
)

key_dates (
  id, event, window_label, status, budget_note
  -- "window_label" is free text (e.g. "Late Nov 2026") — most real dates are estimated ranges, not exact ISO dates.
  -- Named window_label, not window, because WINDOW is a reserved word in Postgres.
)
```

**Category enum** (from Monthly Rollup headers, real xlsx order): Mess Hall/Dining, Uniform/Gear/Laundry, Personal Care, Weekend/Leave/Travel, Academic/Books, Transportation, Health/Medical, Tech & Subscriptions, Gifts & Occasions, Other.

**Payment methods** (real xlsx Settings tab): SoFi Debit, Ally, Payoneer, Cash, VMI Cadet Store Charge, Other. Payoneer is a payment method only — it does **not** have its own balance/starting-balance field.

**Income sources** (real xlsx, not a hard constraint — free text with UI suggestions): Family Support, Cadet Pay/Stipend, SoFi/Ally Drawdown.

**Cadet Week logic:** `floor((date - matriculation_date) / 7) + 1`, matching the Weekly Rollup sheet. Dates before matriculation are negative weeks (pre-departure spend).

## 4. Pages / features (full parity — build in this order)

1. **Auth** — login screen, gated app, no public routes except `/login`.
2. **Command Deck (`/`)** — the home dashboard. Big stat cards: This Month Spent, This Month Income, Current Balance, Monthly Recurring Burn, Total Saved, Discretionary %, Semester Status. Plus (found in real xlsx, not in original written spec): **Budget vs Actual — This Month** and **Life-to-Date Spend by Category** panels, both per-category. Pull live from computed queries, not stored snapshots.
3. **Quick Add (mobile-first component, available from every page)** — floating action button → transaction or income entry in ≤4 taps. Currency toggle (USD/ETB) auto-converts using current settings FX rate.
4. **Transactions** — full table, filterable by category/date range/necessary-discretionary, editable inline, CSV export.
5. **Income** — same pattern as Transactions.
6. **Weekly Rollup** — table + line chart, computed live from transactions grouped by cadet_week.
7. **Monthly Rollup** — table + stacked bar (category breakdown per month) + running balance line.
8. **Recurring Bills** — CRUD list, shows total monthly recurring burn, flags upcoming billing dates.
9. **Savings Goals** — progress bars, computed remaining/monthly-needed.
10. **Net Worth Tracker** — snapshot log + variance vs. computed balance (catches tracking errors early).
11. **Semester Planner** — Fall 2026 / Spring 2027 cards, budget pacing (elapsed % vs spend %), status badge (On Pace / Over Pace / Under Pace).
12. **Insights** — life-to-date totals, avg daily/weekly spend, days since matriculation — all computed, no manual entry.
13. **Key Dates** — leave/furlough calendar with budget notes, static-ish table with edit capability.
14. **Settings** — FX rate, matriculation date, starting balances. Changing FX rate should NOT retroactively rewrite historical `amount_usd` values (each transaction locks in the rate at entry time via a `BEFORE INSERT` trigger).

## 5. Data migration
One-time script pulling rows out of `Expense_Tracker.xlsx` Transactions/Income/Recurring Bills/Savings Goals/Net Worth/Key Dates tabs into the new tables, skipping the literal "example row — delete or overwrite" placeholder rows. As of the Phase 1/2 build, the real workbook's Transactions and Income tabs contain **only** that placeholder row — nothing real to migrate yet. Real reference data that **is** worth seeding directly (not placeholders): Settings (FX 180, matriculation 2026-08-15), 10 categories, Fall/Spring semester windows, all 10 Key Dates rows, the one real Recurring Bill ("Claude," $20/mo), and the Day-1 Net Worth baseline snapshot.

## 6. Explicit non-goals for v1
- No multi-user support, no sharing/permissions
- No bank account sync (Plaid, etc.) — manual entry only, matching current workflow
- No native mobile app — responsive PWA-feel web app is enough

## 7. Build log / session decisions

This section is the persistent record of decisions made while actually building this (vs. the original written spec above, which is now historical intent). Read this before starting any new phase.

- **Supabase project:** `xgmznitqwcvjgeoyghor` (dashboard name "Bigboy money count", org `qgpwmwhoqnyhyomlqnkb` / account `a2020202432@gmail.com`) is authoritative. It was initially invisible to the Supabase MCP connector (which was scoped to a different org, `systemsbyabel.com` / `bgdzmiamjgnmvudvoxny`, holding unrelated projects like `vmi-expense-tracker` — not used, do not touch). Abel reconfigured the Supabase connector itself so it now points at the right account; `mcp__Supabase__list_projects` shows only `xgmznitqwcvjgeoyghor` as of Phase 2.
- **DB access:** resolved — the Supabase MCP connector now has direct access to `xgmznitqwcvjgeoyghor`. If a future session finds `list_projects` doesn't show it, that means the connector's scope changed again; ask Abel to check the Supabase dashboard's org switcher.
- **Auth:** Abel creates the one auth user himself in the Supabase dashboard. No signup code exists anywhere in the app.
- **Next.js 16 specifics:** use `proxy.ts` (not `middleware.ts`), exported function name `proxy`. `cookies()`/`headers()`/`params`/`searchParams` are all async — always `await` them. `next lint` is removed; lint via the `eslint` CLI (`npm run lint`, already wired in `package.json`). Turbopack is the default bundler.
- **Supabase SSR pattern:** `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server, async `cookies()`), `lib/supabase/proxy.ts` (`updateSession`, uses `supabase.auth.getClaims()` — never trust `getSession()` on the server), root `proxy.ts` wires it up with a matcher excluding static assets.
- **Schema corrections from the real xlsx** (overriding the original spec's data model): no `payoneer_starting_balance` / `payoneer_actual` anywhere — SoFi/Ally/Cash are the only balance-holding accounts, Payoneer is payment-method-only. Categories are a real lookup table with `monthly_budget`, not a bare enum, because Command Deck's "Budget vs Actual" panel needs it. `key_dates.window` is free text, not a clean start/end date pair, because most real rows are "Estimated" fuzzy ranges.
- **Fonts:** IBM Plex Mono via `next/font/google`; Clash Display + General Sans via Fontshare CDN link tags in `app/layout.tsx` `<head>` (matches `command-deck-mono.html` exactly, no font files were provided to self-host).
- **Phase 1 status:** scaffold complete — Next.js 16 + Tailwind v4 + Supabase SSR auth (`proxy.ts` gate) + full design token system in `app/globals.css` + all 12 route shells + nav shell (`components/nav/AppShell.tsx`) + Quick Add FAB shell (`components/QuickAddFab.tsx`, real logic lands in Phase 3) + a fully-styled static Command Deck (`app/(app)/page.tsx`) built directly against `command-deck-mono.html`, including the Budget-vs-Actual and Life-to-Date panels not in the original written spec. Placeholder values throughout.
- **Phase 2 status:** schema live on `xgmznitqwcvjgeoyghor` — 9 tables (`settings`, `categories`, `semesters`, `transactions`, `income`, `recurring_bills`, `savings_goals`, `net_worth_snapshots`, `key_dates`) with RLS (`authenticated`-only, single policy per table — no `user_id` column, genuinely single-user), a `set_computed_fields()` trigger locking in `cadet_week`/`amount_usd` on insert/update of `transactions`/`income` using the settings row active at that moment, and 9 computed views (`account_balance`, `budget_vs_actual_this_month`, `life_to_date_spend_by_category`, `weekly_rollup`, `monthly_rollup`, `monthly_category_totals`, `savings_goal_progress`, `net_worth_variance`, `semester_pacing`) all forced to `security_invoker = true` so they respect the querying user's RLS rather than the view owner's. Real reference data seeded: settings (fx 180, matriculation 2026-08-15), 10 categories (budgets all $0, Abel hasn't set them yet), Fall/Spring semester windows, all 10 Key Dates rows, the "Claude" recurring bill, and the Day-1 net worth baseline. `transactions`/`income` are empty (only placeholder rows existed in the source xlsx). Raw SQL lives in `supabase/migrations/` for the record; `lib/supabase/database.types.ts` has the generated types wired into both Supabase clients. Ran `get_advisors` after every DDL change — the only remaining warnings are the expected "RLS policy always true" ones (correct for single-user) and a pre-existing `rls_auto_enable()` platform function not created by this app.
- **Phase 3 status:** Command Deck fully wired to live Supabase queries/views (no more placeholders); Quick Add is a real working form (transaction/income toggle, category picker, USD/ETB conversion preview) backed by server actions. Color-signal question resolved: icon direction + badge weight only, no hue.
- **Phase 4 status:** Transactions and Income are full CRUD tables — filters, inline edit (server actions bound per-row id), delete, client-side CSV export matching the real xlsx column layout.
- **Phase 5 status:** Weekly Rollup (cash-flow line chart + running-balance line chart, kept as two charts since the two metrics live on very different scales — no dual-axis) and Monthly Rollup (stacked category bar chart + running-balance line) both built with Recharts, following the project's `dataviz` skill. The 10-category stacked bar uses a validated monochrome grayscale ramp (`lib/chart-colors.ts`) since hue is off-limits — it clears the contrast floor but lands just under ideal adjacent-lightness separation (a real limit of 10 pure-gray slots), so it leans on a legend, 2px segment gaps, hover tooltips, and the table underneath rather than asking color alone to carry identity.
- **Phase 6 status:** Recurring Bills, Savings Goals, Net Worth Tracker, Semester Planner, Insights, Key Dates, and Settings are all built out with real CRUD/computed views. Insights has no dedicated Phase 2 view — its figures (life-to-date totals, averages, highest category/week, month-over-month, projected end-of-semester balance) are computed server-side directly in `app/(app)/insights/page.tsx`.
- **Phase 7 status:** `scripts/migrate-xlsx.mjs` (run via `npm run migrate:xlsx -- path/to/file.xlsx [--dry-run]`) imports Transactions/Income/Savings Goals only — Recurring Bills, Net Worth, and Key Dates already got their real rows seeded directly in Phase 2, so re-running an importer against those tabs would duplicate them. It signs in with real Supabase Auth credentials (prompted interactively) rather than a service_role key, since RLS requires an authenticated session for both reads (category lookups) and writes — `--dry-run` still signs in for accurate category-match previews, it just skips the final insert calls. Verified against the real `Expense_Tracker.xlsx`: correctly detects and skips all 3 placeholder rows (Transactions, Income, Savings Goals example rows), so there is currently nothing to import — the script is ready for whenever Abel has real historical entries to bring in.
- **Phase 8 status:** cross-page consistency checked (every page uses `PageHeader`/`Glass` except Command Deck, which intentionally keeps its own richer hero treatment matching the mockup). Accessibility audit found `text-faint` (2.18:1 contrast, fails WCAG AA) had been overused across Phases 4-6 for real functional content — table headers, body data, form labels — instead of its spec-scoped role ("captions, tick marks, disabled"); promoted to `text-dim` (5.44:1, clears AA) everywhere except the one genuinely correct use (Cadet Week progress bar tick captions). Focus-visible outlines and `prefers-reduced-motion` were already handled in Phase 1. No color-hue violations found (grepped for `text-red`/`bg-green`/etc. and stray hex codes — only the ring-gradient's two neutral grays, which match the original mockup).
- **Deployment:** no Vercel action taken — production deploy / `finance.abelatnafu.com` DNS is Abel's call, not something to do unilaterally. A Vercel project named `final-comand-center` already exists and auto-deploys previews on push via its GitHub integration (confirmed working across every phase's push, including this one).
