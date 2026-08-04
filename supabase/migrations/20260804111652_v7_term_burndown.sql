-- v7: one row per day of the term, so overspending is something you can see
-- rather than something you have to compute.
--
-- The part that is easy to get wrong: spendable cash is not just transactions.
-- A transfer from checking into a meal-plan account genuinely REDUCES spendable
-- cash, because liquid_position excludes meal-plan and credit accounts. So the
-- daily movement series is a union of three sources, all restricted to accounts
-- whose kind is neither 'credit' nor 'meal_plan':
--
--   * transactions on a spendable account   (+in, -out)
--   * transfers out of a spendable account  (-)
--   * transfers into a spendable account    (+)
--
-- Opening balance is derived by working backwards from today's liquid position
-- rather than replaying every account's opening balance, which is both cheaper
-- and harder to get subtly wrong.

create view term_burndown with (security_invoker = true) as
with spendable_movements as (
  select tx.user_id, tx.occurred_on as day,
         case when tx.direction = 'in' then tx.amount_minor else -tx.amount_minor end as delta
  from transactions tx
  join accounts a on a.id = tx.account_id
  where a.kind not in ('credit', 'meal_plan')

  union all

  select tr.user_id, tr.occurred_on, -tr.amount_minor
  from transfers tr
  join accounts a on a.id = tr.from_account_id
  where a.kind not in ('credit', 'meal_plan')

  union all

  select tr.user_id, tr.occurred_on, tr.amount_minor
  from transfers tr
  join accounts a on a.id = tr.to_account_id
  where a.kind not in ('credit', 'meal_plan')
), daily as (
  select user_id, day, sum(delta)::bigint as net
  from spendable_movements
  group by user_id, day
), opening as (
  select t.id as term_id, t.user_id, t.starts_on, t.ends_on, t.target_end_balance_minor,
         (coalesce(lp.total_liquid_usd_minor, 0)::numeric - coalesce((
            select sum(d.net) from daily d
            where d.user_id = t.user_id and d.day >= t.starts_on and d.day <= current_date
         ), 0))::bigint as opening_minor
  from terms t
  left join liquid_position lp on lp.user_id = t.user_id
  where not t.is_archived
), days as (
  select o.*,
         generate_series(o.starts_on::timestamptz, o.ends_on::timestamptz, interval '1 day')::date as day
  from opening o
)
select
  d.term_id,
  d.user_id,
  d.day,
  d.starts_on,
  d.ends_on,
  -- Null after today: a burn-down line must not pretend to know the future.
  case when d.day <= current_date
       then (d.opening_minor::numeric
             + coalesce(sum(x.net) over (partition by d.term_id order by d.day), 0))::bigint
  end as actual_minor,
  -- Linear from the opening balance to whatever you said you want left over.
  (d.opening_minor::numeric
   + ((d.target_end_balance_minor - d.opening_minor)::numeric * (d.day - d.starts_on)::numeric
      / nullif(d.ends_on - d.starts_on, 0)::numeric))::bigint as ideal_minor
from days d
left join daily x on x.user_id = d.user_id and x.day = d.day;

grant select on term_burndown to authenticated, service_role;
