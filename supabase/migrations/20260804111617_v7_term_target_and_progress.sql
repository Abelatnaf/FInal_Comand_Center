-- v7: the runway number stops assuming no more money is coming in, and stops
-- spending you to exactly $0 on the last day of term.
--
--   safe_daily = (liquid + expected_income - target_end_balance) / days_remaining
--
-- `projected_zero_on` uses the same numerator on purpose -- two figures on the
-- same screen derived from different money would contradict each other.

alter table terms
  add column target_end_balance_minor bigint not null default 0;

comment on column terms.target_end_balance_minor is
  'What you want left over when the term ends. Per-term, because what you want '
  'left at the end of fall is not what you want left at the end of spring.';

drop view if exists term_progress cascade;

create view term_progress with (security_invoker = true) as
with base as (
  select
    t.id as term_id,
    t.user_id,
    t.name,
    t.starts_on,
    t.ends_on,
    t.target_end_balance_minor,
    (t.ends_on - t.starts_on) + 1 as total_days,
    greatest((least(current_date, t.ends_on) - t.starts_on) + 1, 0) as days_elapsed,
    greatest(t.ends_on - current_date, 0) as days_remaining,
    coalesce((
      select sum(tx.amount_minor) from transactions tx
      where tx.user_id = t.user_id and tx.direction = 'in'
        and tx.occurred_on between t.starts_on and least(current_date, t.ends_on)
    ), 0)::bigint as received_minor,
    coalesce((
      select sum(tx.amount_minor) from transactions tx
      where tx.user_id = t.user_id and tx.direction = 'out'
        and tx.occurred_on between t.starts_on and least(current_date, t.ends_on)
    ), 0)::bigint as spent_minor,
    -- Today alone, which is the number you can actually act on standing in line.
    coalesce((
      select sum(tx.amount_minor) from transactions tx
      where tx.user_id = t.user_id and tx.direction = 'out'
        and tx.occurred_on = current_date
    ), 0)::bigint as spent_today_minor,
    -- Money still to arrive before the term ends: count each active recurring
    -- income's occurrences from tomorrow (or its next due date, whichever is
    -- later) to ends_on. A next_due_on in the past has already been posted or
    -- is about to be, so it must not be counted twice.
    coalesce((
      select sum(re.amount_minor * (
        select count(*) from generate_series(
          greatest(re.next_due_on, current_date + 1)::timestamptz,
          t.ends_on::timestamptz,
          case re.cadence
            when 'weekly'    then interval '7 days'
            when 'monthly'   then interval '1 month'
            when 'quarterly' then interval '3 months'
            when 'yearly'    then interval '1 year'
          end
        ) g
      ))
      from recurring_entries re
      where re.user_id = t.user_id and re.direction = 'in'
        and re.is_active and re.auto_post
    ), 0)::bigint as expected_income_minor,
    coalesce(lp.total_liquid_usd_minor, 0) as liquid_minor,
    coalesce(lp.meal_plan_minor, 0) as meal_plan_minor
  from terms t
  left join liquid_position lp on lp.user_id = t.user_id
  where not t.is_archived
), derived as (
  select b.*,
         (b.liquid_minor + b.expected_income_minor) - b.target_end_balance_minor
           as spendable_minor
  from base b
)
select
  term_id, user_id, name, starts_on, ends_on, target_end_balance_minor,
  total_days, days_elapsed, days_remaining,
  received_minor, spent_minor, spent_today_minor, expected_income_minor,
  liquid_minor, meal_plan_minor, spendable_minor,
  case when days_remaining > 0 and spendable_minor > 0
       then spendable_minor / days_remaining end as safe_daily_minor,
  case when days_elapsed > 0
       then spent_minor / days_elapsed end as actual_daily_minor,
  case when days_remaining > 0
       then meal_plan_minor / days_remaining end as safe_daily_meal_minor,
  -- Positive only when the target is already out of reach, so the UI can say
  -- "you're short by $X" instead of rendering negative dollars-per-day.
  case when spendable_minor < 0 then -spendable_minor end as shortfall_minor,
  case when days_elapsed > 0 and spent_minor > 0 and spendable_minor > 0
       then current_date + (spendable_minor / (spent_minor / days_elapsed))::int
  end as projected_zero_on
from derived d;

-- get_shared_snapshot reads term_progress, so the cascade above dropped it.
create or replace function get_shared_snapshot(p_token text)
returns table (
  found boolean,
  term_name text,
  days_remaining integer,
  money_left_minor bigint,
  safe_daily_minor bigint,
  actual_daily_minor bigint,
  next_due_title text,
  next_due_remaining_usd_minor bigint,
  next_due_days_until_due integer,
  next_due_is_past_due boolean
)
language plpgsql
security definer
set search_path to ''
as $$
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
grant select on term_progress to anon, authenticated, service_role;
