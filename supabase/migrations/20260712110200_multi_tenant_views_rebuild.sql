-- ============================================================
-- Multi-tenant conversion, part 3: recreate all 9 computed views
-- (dropped in part 1) against the new accounts table + renamed
-- columns. All remain security_invoker = true, so RLS on the
-- underlying tables scopes every view to the querying user with
-- no explicit user_id filters needed here. Adds one new companion
-- view, net_worth_snapshot_detail, for the per-account breakdown
-- that used to live in sofi_actual/ally_actual/cash_actual.
-- ============================================================

create or replace view public.account_balance
with (security_invoker = true) as
select
  (select coalesce(sum(starting_balance), 0) from public.accounts) as starting_total,
  coalesce((select sum(amount_usd) from public.income), 0) as total_income,
  coalesce((select sum(amount_usd) from public.transactions), 0) as total_expenses,
  (select coalesce(sum(starting_balance), 0) from public.accounts)
    + coalesce((select sum(amount_usd) from public.income), 0)
    - coalesce((select sum(amount_usd) from public.transactions), 0) as current_balance;

create or replace view public.budget_vs_actual_this_month
with (security_invoker = true) as
select
  c.id as category_id,
  c.name as category,
  c.sort_order,
  c.monthly_budget as budget,
  coalesce(sum(t.amount_usd) filter (
    where date_trunc('month', t.date) = date_trunc('month', current_date)
  ), 0) as actual
from public.categories c
left join public.transactions t on t.category_id = c.id
group by c.id, c.name, c.sort_order, c.monthly_budget
order by c.sort_order;

create or replace view public.life_to_date_spend_by_category
with (security_invoker = true) as
select
  c.id as category_id,
  c.name as category,
  c.sort_order,
  coalesce(sum(t.amount_usd), 0) as total
from public.categories c
left join public.transactions t on t.category_id = c.id
group by c.id, c.name, c.sort_order
order by c.sort_order;

-- 52-week span from the user's tracking start date.
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
  (select coalesce(sum(starting_balance), 0) from public.accounts)
    + sum(coalesce(inc.total_income, 0) - coalesce(tx.total_expenses, 0))
        over (order by w.week_number rows between unbounded preceding and current row) as running_balance
from weeks w
left join tx on tx.week_number = w.week_number
left join inc on inc.week_number = w.week_number
order by w.week_number;

-- 12-month span from the user's tracking start date.
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
  (select coalesce(sum(starting_balance), 0) from public.accounts)
    + sum(coalesce(inc.total_income, 0) - coalesce(tx.total_expenses, 0))
        over (order by m.month rows between unbounded preceding and current row) as running_balance
from months m
left join tx on tx.month = m.month
left join inc on inc.month = m.month
order by m.month;

create or replace view public.monthly_category_totals
with (security_invoker = true) as
select
  date_trunc('month', t.date)::date as month,
  c.id as category_id,
  c.name as category,
  c.sort_order,
  sum(t.amount_usd) as total
from public.transactions t
join public.categories c on c.id = t.category_id
group by 1, 2, 3, 4
order by 1, c.sort_order;

create or replace view public.savings_goal_progress
with (security_invoker = true) as
select
  id,
  name,
  target_amount_usd,
  target_date,
  saved_so_far_usd,
  target_amount_usd - saved_so_far_usd as remaining,
  case when target_amount_usd > 0
    then round(100.0 * saved_so_far_usd / target_amount_usd, 1)
    else 0
  end as percent_complete,
  case
    when target_date is null then null
    when target_date <= current_date then greatest(target_amount_usd - saved_so_far_usd, 0)
    else round(
      (target_amount_usd - saved_so_far_usd) / greatest(1, extract(day from age(target_date, current_date)) / 30.44),
      2
    )
  end as monthly_needed
from public.savings_goals;

-- Per-account balance breakdown for a snapshot (replaces sofi_actual/ally_actual/cash_actual).
create or replace view public.net_worth_snapshot_detail
with (security_invoker = true) as
select
  b.snapshot_id,
  b.account_id,
  a.name as account_name,
  a.sort_order,
  b.amount
from public.net_worth_snapshot_balances b
join public.accounts a on a.id = b.account_id
order by b.snapshot_id, a.sort_order;

create or replace view public.net_worth_variance
with (security_invoker = true) as
with base as (
  select
    n.id,
    n.snapshot_date,
    n.notes,
    coalesce((select sum(amount) from public.net_worth_snapshot_balances b where b.snapshot_id = n.id), 0) as total_actual,
    (select coalesce(sum(starting_balance), 0) from public.accounts)
      + coalesce((select sum(amount_usd) from public.income where date <= n.snapshot_date), 0)
      - coalesce((select sum(amount_usd) from public.transactions where date <= n.snapshot_date), 0)
      as computed_balance
  from public.net_worth_snapshots n
)
select *, total_actual - computed_balance as variance
from base
order by snapshot_date;

create or replace view public.semester_pacing
with (security_invoker = true) as
with base as (
  select
    s.id,
    s.name,
    s.start_date,
    s.end_date,
    (s.end_date - s.start_date) as total_days,
    greatest(0, least(current_date, s.end_date) - s.start_date) as elapsed_days,
    coalesce((select sum(t.amount_usd) from public.transactions t where t.date between s.start_date and s.end_date), 0) as actual_spend,
    coalesce((select sum(i.amount_usd) from public.income i where i.date between s.start_date and s.end_date), 0) as income,
    (select coalesce(sum(monthly_budget), 0) from public.categories) * ((s.end_date - s.start_date) / 30.44) as budget
  from public.semesters s
),
calc as (
  select
    *,
    round(100.0 * elapsed_days / nullif(total_days, 0), 1) as elapsed_percent,
    case when budget > 0 then round(100.0 * actual_spend / budget, 1) else null end as spend_percent
  from base
)
select
  *,
  case
    when current_date < start_date then 'Not Started'
    when current_date > end_date then 'Completed'
    when budget = 0 then 'On Pace'
    when spend_percent > elapsed_percent + 5 then 'Over Pace'
    when spend_percent < elapsed_percent - 5 then 'Under Pace'
    else 'On Pace'
  end as status
from calc
order by start_date;
