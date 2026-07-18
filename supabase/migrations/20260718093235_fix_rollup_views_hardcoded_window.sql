-- Real bug found while verifying the Weekly/Monthly Summary pages work:
-- both weekly_rollup and monthly_rollup generated a FIXED window (weeks
-- 1-52, and 12 months) anchored only to settings.tracking_start_date,
-- with no relationship to "today" or to where the user's real data
-- actually falls. Any transaction/income whose week_number or month fell
-- outside that fixed window was silently dropped from both the display
-- AND the running_balance sum — not an edge case: confirmed live against
-- production that Abel's own tracking_start_date (2026-08-15) is in the
-- future relative to today (2026-07-18), so all 3 of his real
-- transactions have week_number = -4, which is below the view's
-- hardcoded floor of 1. His Weekly Summary and Monthly Summary have been
-- showing $0 the whole time.
--
-- Fix: the window is now derived from the real data — the min/max
-- week_number actually present across transactions and income, widened
-- to always include the current week/month too (so a brand-new period
-- with zero activity yet still renders). This means nothing is ever
-- silently excluded regardless of how tracking_start_date relates to
-- real usage dates, and running_balance's cumulative sum now correctly
-- starts from the TRUE earliest week/month of activity rather than an
-- arbitrary fixed week 1, so it still lands on the right total by the
-- final row.

create or replace view public.weekly_rollup
with (security_invoker = true) as
with bounds as (
  select
    least(
      coalesce((select min(week_number) from public.transactions), 1),
      coalesce((select min(week_number) from public.income), 1),
      floor((current_date - (select tracking_start_date from public.settings)) / 7.0)::int + 1
    ) as min_week,
    greatest(
      coalesce((select max(week_number) from public.transactions), 1),
      coalesce((select max(week_number) from public.income), 1),
      floor((current_date - (select tracking_start_date from public.settings)) / 7.0)::int + 1
    ) as max_week
),
weeks as (
  select
    gs.gs as week_number,
    (select tracking_start_date from public.settings) + (gs.gs - 1) * 7 as week_start,
    (select tracking_start_date from public.settings) + (gs.gs - 1) * 7 + 6 as week_end
  from bounds, generate_series(bounds.min_week, bounds.max_week) gs(gs)
),
tx as (
  select
    week_number,
    sum(amount_usd) as total_expenses,
    sum(amount_usd) filter (where necessity = 'Necessary') as necessary,
    sum(amount_usd) filter (where necessity = 'Discretionary') as discretionary
  from public.transactions
  group by week_number
),
inc as (
  select week_number, sum(amount_usd) as total_income
  from public.income
  group by week_number
)
select
  w.week_number,
  w.week_start,
  w.week_end,
  coalesce(tx.total_expenses, 0) as total_expenses,
  coalesce(tx.necessary, 0) as necessary,
  coalesce(tx.discretionary, 0) as discretionary,
  coalesce(inc.total_income, 0) as total_income,
  coalesce(inc.total_income, 0) - coalesce(tx.total_expenses, 0) as net,
  (select coalesce(sum(case when kind = 'liability' then -starting_balance else starting_balance end), 0) from public.accounts)
    + sum(coalesce(inc.total_income, 0) - coalesce(tx.total_expenses, 0)) over (order by w.week_number rows between unbounded preceding and current row) as running_balance
from weeks w
left join tx on tx.week_number = w.week_number
left join inc on inc.week_number = w.week_number
order by w.week_number;

create or replace view public.monthly_rollup
with (security_invoker = true) as
with bounds as (
  select
    least(
      coalesce((select min(date_trunc('month', date)::date) from public.transactions), date_trunc('month', current_date)::date),
      coalesce((select min(date_trunc('month', date)::date) from public.income), date_trunc('month', current_date)::date),
      date_trunc('month', current_date)::date
    ) as min_month,
    greatest(
      coalesce((select max(date_trunc('month', date)::date) from public.transactions), date_trunc('month', current_date)::date),
      coalesce((select max(date_trunc('month', date)::date) from public.income), date_trunc('month', current_date)::date),
      date_trunc('month', current_date)::date
    ) as max_month
),
months as (
  select gs::date as month
  from bounds, generate_series(bounds.min_month::timestamp, bounds.max_month::timestamp, interval '1 month') gs
),
tx as (
  select date_trunc('month', date)::date as month, sum(amount_usd) as total_expenses
  from public.transactions
  group by date_trunc('month', date)::date
),
inc as (
  select date_trunc('month', date)::date as month, sum(amount_usd) as total_income
  from public.income
  group by date_trunc('month', date)::date
)
select
  m.month,
  coalesce(tx.total_expenses, 0) as total_expenses,
  coalesce(inc.total_income, 0) as total_income,
  coalesce(inc.total_income, 0) - coalesce(tx.total_expenses, 0) as net,
  (select coalesce(sum(case when kind = 'liability' then -starting_balance else starting_balance end), 0) from public.accounts)
    + sum(coalesce(inc.total_income, 0) - coalesce(tx.total_expenses, 0)) over (order by m.month rows between unbounded preceding and current row) as running_balance
from months m
left join tx on tx.month = m.month
left join inc on inc.month = m.month
order by m.month;
