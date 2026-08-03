-- Budgets are compared against amount_usd_minor, the only figure comparable
-- across this app's two currencies. Name the column for what it actually
-- holds rather than leaving that to a comment.
alter table public.categories
  rename column monthly_budget_minor to monthly_budget_usd_minor;

-- Budget vs. actual for the current calendar month. Derived every read, so a
-- budget can never drift from the spending it is measured against.
create view public.budget_status
with (security_invoker = true) as
select c.id as category_id,
       c.user_id,
       c.name,
       c.color,
       c.icon,
       c.sort_order,
       c.monthly_budget_usd_minor,
       coalesce(sum(t.amount_usd_minor), 0)::bigint as spent_usd_minor,
       case
         when c.monthly_budget_usd_minor is null or c.monthly_budget_usd_minor = 0 then null::bigint
         else (c.monthly_budget_usd_minor - coalesce(sum(t.amount_usd_minor), 0))::bigint
       end as remaining_usd_minor,
       case
         when c.monthly_budget_usd_minor is null or c.monthly_budget_usd_minor = 0 then null::numeric
         else round(coalesce(sum(t.amount_usd_minor), 0)::numeric * 100 / c.monthly_budget_usd_minor, 1)
       end as percent_used
from public.categories c
left join public.transactions t
  on t.category_id = c.id
 and t.direction = 'out'
 and t.occurred_on >= date_trunc('month', current_date)::date
 and t.occurred_on < (date_trunc('month', current_date) + interval '1 month')::date
where c.kind = 'expense'
  and c.is_archived = false
group by c.id, c.user_id, c.name, c.color, c.icon, c.sort_order, c.monthly_budget_usd_minor;

-- Income / spend / net per calendar month, in USD minor units. Every figure
-- uses each transaction's own frozen rate, so these totals never move when
-- today's rate changes.
create view public.monthly_summary
with (security_invoker = true) as
select user_id,
       date_trunc('month', occurred_on)::date as month,
       sum(case when direction = 'in' then amount_usd_minor else 0 end)::bigint as income_usd_minor,
       sum(case when direction = 'out' then amount_usd_minor else 0 end)::bigint as spent_usd_minor,
       sum(case when direction = 'in' then amount_usd_minor else -amount_usd_minor end)::bigint as net_usd_minor,
       count(*)::bigint as entry_count
from public.transactions
group by user_id, date_trunc('month', occurred_on);

-- Per-category spend per month, for the breakdown and trend charts.
create view public.category_spend_by_month
with (security_invoker = true) as
select t.user_id,
       date_trunc('month', t.occurred_on)::date as month,
       c.id as category_id,
       c.name as category_name,
       c.color as category_color,
       c.icon as category_icon,
       sum(t.amount_usd_minor)::bigint as spent_usd_minor,
       count(*)::bigint as entry_count
from public.transactions t
join public.categories c on c.id = t.category_id
where t.direction = 'out'
group by t.user_id, date_trunc('month', t.occurred_on), c.id, c.name, c.color, c.icon;

grant select on public.budget_status to anon, authenticated, service_role;
grant select on public.monthly_summary to anon, authenticated, service_role;
grant select on public.category_spend_by_month to anon, authenticated, service_role;
