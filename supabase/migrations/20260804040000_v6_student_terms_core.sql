-- v6: reorient around the academic term.
--
-- A student's money arrives as a lump (aid refund, summer earnings, money from
-- home) and has to last until a date. "What did I spend this month" is the
-- wrong question; "will this last to the end of term" is the right one.
--
-- Also drops three things that don't apply at this age, on request: net worth
-- (mostly zero or negative and demoralising), credit-card utilisation, and the
-- tax-deductible flag. Credit-card *accounts* stay -- a first card is real --
-- only the limit/utilisation feature goes.

create table terms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  starts_on date not null,
  ends_on date not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on)
);
create index terms_user_idx on terms (user_id);
create index terms_range_idx on terms (user_id, starts_on, ends_on);
alter table terms enable row level security;
create policy terms_own on terms
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Dining dollars behave exactly like an account: an opening balance you spend
-- down. Reusing the account machinery means balances, the ledger and category
-- reporting all work on it for free.
alter table accounts drop constraint accounts_kind_check;
alter table accounts add constraint accounts_kind_check
  check (kind in ('checking', 'savings', 'cash', 'credit', 'meal_plan', 'investment', 'other'));

drop view if exists net_worth_by_month;
drop view if exists savings_goal_progress;
drop view if exists liquid_position;
drop view if exists balance_by_account;
drop view if exists budget_status;
drop view if exists transactions_with_week;

alter table accounts drop column credit_limit_minor;
alter table transactions drop column is_tax_deductible;

-- The budget window is a term when one is running, so a month-specific name
-- would be a lie half the time.
alter table categories rename column monthly_budget_usd_minor to budget_usd_minor;

create view balance_by_account with (security_invoker = true) as
select
  a.id as account_id, a.user_id, a.name, a.kind, a.institution, a.is_archived,
  a.kind = 'credit' as is_liability,
  a.kind = 'meal_plan' as is_meal_plan,
  (
    a.opening_balance_minor
    + coalesce((select sum(case when t.direction = 'in' then t.amount_minor else -t.amount_minor end)
                from transactions t where t.account_id = a.id), 0)
    - coalesce((select sum(tr.amount_minor) from transfers tr where tr.from_account_id = a.id), 0)
    + coalesce((select sum(tr.amount_minor) from transfers tr where tr.to_account_id = a.id), 0)
  )::bigint as balance_minor
from accounts a;

-- Dining dollars are deliberately NOT spendable cash: you can't pay rent with
-- them, so folding them into the runway figure would overstate what's actually
-- available. They get their own line and their own runway.
create view liquid_position with (security_invoker = true) as
select
  user_id,
  coalesce(sum(balance_minor) filter (where not is_liability and not is_meal_plan), 0)::bigint
    as total_liquid_usd_minor,
  coalesce(sum(balance_minor) filter (where is_meal_plan), 0)::bigint as meal_plan_minor,
  coalesce(-sum(balance_minor) filter (where is_liability), 0)::bigint as card_balance_minor
from balance_by_account
where is_archived = false
group by user_id;

create view current_term with (security_invoker = true) as
select distinct on (user_id) id as term_id, user_id, name, starts_on, ends_on
from terms
where not is_archived and current_date between starts_on and ends_on
order by user_id, starts_on desc;

-- Everything the home screen needs to answer "will this last?".
create view term_progress with (security_invoker = true) as
with base as (
  select
    t.id as term_id, t.user_id, t.name, t.starts_on, t.ends_on,
    (t.ends_on - t.starts_on + 1) as total_days,
    greatest(least(current_date, t.ends_on) - t.starts_on + 1, 0) as days_elapsed,
    greatest(t.ends_on - current_date, 0) as days_remaining,
    coalesce((select sum(tx.amount_minor) from transactions tx
              where tx.user_id = t.user_id and tx.direction = 'in'
                and tx.occurred_on between t.starts_on and least(current_date, t.ends_on)), 0)::bigint
      as received_minor,
    coalesce((select sum(tx.amount_minor) from transactions tx
              where tx.user_id = t.user_id and tx.direction = 'out'
                and tx.occurred_on between t.starts_on and least(current_date, t.ends_on)), 0)::bigint
      as spent_minor,
    coalesce(lp.total_liquid_usd_minor, 0) as liquid_minor,
    coalesce(lp.meal_plan_minor, 0) as meal_plan_minor
  from terms t
  left join liquid_position lp on lp.user_id = t.user_id
  where not t.is_archived
)
select
  b.*,
  -- What you can spend per day and still reach the end. Null rather than a
  -- division by zero on the last day.
  case when b.days_remaining > 0 then (b.liquid_minor / b.days_remaining)::bigint end
    as safe_daily_minor,
  case when b.days_elapsed > 0 then (b.spent_minor / b.days_elapsed)::bigint end
    as actual_daily_minor,
  case when b.days_remaining > 0 then (b.meal_plan_minor / b.days_remaining)::bigint end
    as safe_daily_meal_minor,
  -- When the money runs out at the current rate. Null when nothing is being
  -- spent, rather than a date infinitely far away.
  case
    when b.days_elapsed > 0 and b.spent_minor > 0
    then current_date + (b.liquid_minor / (b.spent_minor / b.days_elapsed))::int
  end as projected_zero_on
from base b;

-- Budgets follow the term when one is running, and fall back to the calendar
-- month when none is -- so the screen still works over the summer.
create view budget_status with (security_invoker = true) as
with win as (
  select
    c.user_id,
    coalesce(t.starts_on, date_trunc('month', current_date)::date) as win_start,
    coalesce(t.ends_on, (date_trunc('month', current_date) + interval '1 month - 1 day')::date) as win_end,
    t.term_id is not null as is_term,
    t.name as window_name
  from (select distinct user_id from categories) c
  left join current_term t on t.user_id = c.user_id
)
select
  c.id as category_id, c.user_id, c.name, c.color, c.icon, c.sort_order, c.budget_usd_minor,
  w.is_term, w.window_name, w.win_start, w.win_end,
  coalesce(sum(t.amount_minor), 0)::bigint as spent_usd_minor,
  case when c.budget_usd_minor is null or c.budget_usd_minor = 0 then null::bigint
       else (c.budget_usd_minor - coalesce(sum(t.amount_minor), 0))::bigint end as remaining_usd_minor,
  case when c.budget_usd_minor is null or c.budget_usd_minor = 0 then null::numeric
       else round(coalesce(sum(t.amount_minor), 0) * 100.0 / c.budget_usd_minor, 1) end as percent_used
from categories c
join win w on w.user_id = c.user_id
left join transactions t
  on t.category_id = c.id and t.direction = 'out'
  and t.occurred_on between w.win_start and w.win_end
where c.kind = 'expense' and c.is_archived = false
group by c.id, c.user_id, c.name, c.color, c.icon, c.sort_order, c.budget_usd_minor,
         w.is_term, w.window_name, w.win_start, w.win_end;

create view savings_goal_progress with (security_invoker = true) as
select
  g.id, g.user_id, g.name, g.target_minor, g.target_date, g.account_id, g.note, g.created_at,
  a.name as account_name,
  coalesce(case when g.account_id is not null then greatest(b.balance_minor, 0) end, g.saved_manual_minor) as saved_minor,
  greatest(g.target_minor - coalesce(case when g.account_id is not null then greatest(b.balance_minor, 0) end, g.saved_manual_minor), 0) as remaining_minor,
  case when g.target_date is not null then g.target_date - current_date end as days_until_target
from savings_goals g
left join accounts a on a.id = g.account_id
left join balance_by_account b on b.account_id = g.account_id;

-- week_number becomes "week of term" -- far more meaningful to a student than
-- weeks since an arbitrary tracking start date.
create view transactions_with_week with (security_invoker = true) as
select
  t.id, t.user_id, t.account_id, t.occurred_on, t.direction, t.amount_minor, t.category_id,
  c.name as category_name, c.color as category_color, c.icon as category_icon,
  t.note, t.tags, t.obligation_id, t.receipt_path, t.created_at,
  te.id as term_id, te.name as term_name,
  case when te.starts_on is not null
    then floor((t.occurred_on - te.starts_on) / 7.0)::int + 1 end as week_number
from transactions t
left join categories c on c.id = t.category_id
left join lateral (
  select tt.* from terms tt
  where tt.user_id = t.user_id and t.occurred_on between tt.starts_on and tt.ends_on
  order by tt.starts_on desc limit 1
) te on true;

-- Net worth is gone, so the share link answers "am I ok for the term" instead.
drop function if exists get_shared_snapshot(text);

create function get_shared_snapshot(p_token text)
returns table (
  found boolean, term_name text, days_remaining integer, money_left_minor bigint,
  safe_daily_minor bigint, actual_daily_minor bigint, next_due_title text,
  next_due_remaining_usd_minor bigint, next_due_days_until_due integer, next_due_is_past_due boolean
)
language plpgsql security definer set search_path to '' as $$
declare v_user_id uuid;
begin
  select user_id into v_user_id from public.share_links
    where id = p_token and revoked_at is null;

  if v_user_id is null then
    return query select false, null::text, null::int, null::bigint, null::bigint,
                        null::bigint, null::text, null::bigint, null::int, null::boolean;
    return;
  end if;

  return query
  select true, tp.name, tp.days_remaining, tp.liquid_minor, tp.safe_daily_minor,
         tp.actual_daily_minor, nd.title, nd.amount_remaining_usd_minor::bigint,
         nd.days_until_due, nd.is_past_due
  from (select v_user_id as user_id) u
  left join lateral (
    select * from public.term_progress p
    where p.user_id = u.user_id and current_date between p.starts_on and p.ends_on limit 1
  ) tp on true
  left join lateral (
    select * from public.obligation_progress op
    where op.user_id = u.user_id and op.status in ('open', 'partial')
    order by (op.due_on is null), op.due_on asc limit 1
  ) nd on true;
end;
$$;

grant execute on function get_shared_snapshot(text) to anon, authenticated;
