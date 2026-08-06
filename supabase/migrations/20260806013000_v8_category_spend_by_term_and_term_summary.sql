-- Term-over-term comparison.
--
-- category_spend_by_month is keyed on the calendar month, and a term spans a
-- ragged set of months (Aug 25 - Dec 14), so it cannot answer "this semester
-- vs last". These two views key on the term instead.
--
-- Both are derived every read, like every other analytics view here -- there
-- is no stored aggregate to drift out of step with the ledger.

create view category_spend_by_term with (security_invoker = true) as
select
  t.user_id,
  t.id as term_id,
  t.name as term_name,
  t.starts_on,
  t.ends_on,
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  sum(tx.amount_minor)::bigint as spent_usd_minor,
  count(*) as entry_count
from terms t
join transactions tx
  on tx.user_id = t.user_id
 and tx.occurred_on between t.starts_on and t.ends_on
 and tx.direction = 'out'
join categories c on c.id = tx.category_id
group by t.user_id, t.id, t.name, t.starts_on, t.ends_on, c.id, c.name, c.color, c.icon;

-- Whole-term totals, plus the per-day figures the comparison actually uses.
--
-- Per-day matters: two terms are rarely the same length, so comparing raw
-- totals would report a 15-week semester as "more expensive" than a 12-week
-- one even at identical daily spending. `elapsed_days` counts only days that
-- have actually happened, so a term in progress is compared on the part of it
-- that exists rather than being flattered by the days still to come.
create view term_summary with (security_invoker = true) as
with base as (
  select
    t.user_id,
    t.id as term_id,
    t.name,
    t.starts_on,
    t.ends_on,
    (t.ends_on - t.starts_on) + 1 as total_days,
    greatest((least(current_date, t.ends_on) - t.starts_on) + 1, 0) as elapsed_days,
    coalesce((
      select sum(tx.amount_minor) from transactions tx
      where tx.user_id = t.user_id and tx.direction = 'out'
        and tx.occurred_on between t.starts_on and least(current_date, t.ends_on)
    ), 0)::bigint as spent_minor,
    coalesce((
      select sum(tx.amount_minor) from transactions tx
      where tx.user_id = t.user_id and tx.direction = 'in'
        and tx.occurred_on between t.starts_on and least(current_date, t.ends_on)
    ), 0)::bigint as received_minor
  from terms t
)
select
  user_id, term_id, name, starts_on, ends_on, total_days, elapsed_days,
  spent_minor, received_minor,
  (received_minor - spent_minor) as net_minor,
  case when elapsed_days > 0 then spent_minor / elapsed_days end as spent_per_day_minor,
  case when elapsed_days > 0 then received_minor / elapsed_days end as received_per_day_minor,
  -- Share of what came in that you did not spend. Null rather than zero when
  -- nothing came in: "you saved 0%" and "there is nothing to take a share of"
  -- are different statements.
  case when received_minor > 0
       then round(((received_minor - spent_minor)::numeric * 100) / received_minor, 1)
  end as savings_rate_percent
from base;

grant select on category_spend_by_term to authenticated, service_role;
grant select on term_summary to authenticated, service_role;
