-- weekly_rollup and monthly_rollup independently summed accounts.starting_balance
-- for their running_balance columns and need the same liability sign-flip
-- just applied to account_balance/net_worth_variance.

create or replace view public.weekly_rollup
with (security_invoker = true) as
with weeks as (
  select
    gs as week_number,
    (select tracking_start_date from public.settings) + ((gs - 1) * 7) as week_start,
    (select tracking_start_date from public.settings) + ((gs - 1) * 7) + 6 as week_end
  from generate_series(1, 52) as gs
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
    + sum(coalesce(inc.total_income, 0) - coalesce(tx.total_expenses, 0))
        over (order by w.week_number rows between unbounded preceding and current row) as running_balance
from weeks w
left join tx on tx.week_number = w.week_number
left join inc on inc.week_number = w.week_number
order by w.week_number;

create or replace view public.monthly_rollup
with (security_invoker = true) as
with months as (
  select
    (date_trunc('month', (select tracking_start_date from public.settings))
      + (gs * interval '1 month'))::date as month
  from generate_series(0, 11) as gs
),
tx as (
  select date_trunc('month', date)::date as month, sum(amount_usd) as total_expenses
  from public.transactions
  group by 1
),
inc as (
  select date_trunc('month', date)::date as month, sum(amount_usd) as total_income
  from public.income
  group by 1
)
select
  m.month,
  coalesce(tx.total_expenses, 0) as total_expenses,
  coalesce(inc.total_income, 0) as total_income,
  coalesce(inc.total_income, 0) - coalesce(tx.total_expenses, 0) as net,
  (select coalesce(sum(case when kind = 'liability' then -starting_balance else starting_balance end), 0) from public.accounts)
    + sum(coalesce(inc.total_income, 0) - coalesce(tx.total_expenses, 0))
        over (order by m.month rows between unbounded preceding and current row) as running_balance
from months m
left join tx on tx.month = m.month
left join inc on inc.month = m.month
order by m.month;
