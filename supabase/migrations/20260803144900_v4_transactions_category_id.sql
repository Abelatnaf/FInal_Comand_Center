-- Move transactions off a bare text category onto a real FK, so renaming a
-- category no longer orphans history and a budget can be attached to it.
-- Categories are archivable; a hard delete only succeeds when nothing
-- references them (mirrors how accounts already behave in this app).

alter table public.transactions
  add column category_id uuid references public.categories(id) on delete set null;

-- Preserve any label already in use that isn't in the seeded starter set,
-- so backfilling can never silently drop a real category off history.
insert into public.categories (user_id, name, kind, color, icon, sort_order)
select distinct t.user_id,
       t.category,
       case when t.direction = 'out' then 'expense' else 'income' end,
       'slate',
       '📦',
       500
from public.transactions t
where t.category is not null and t.category <> ''
on conflict (user_id, kind, name) do nothing;

update public.transactions t
set category_id = c.id
from public.categories c
where c.user_id = t.user_id
  and c.name = t.category
  and c.kind = case when t.direction = 'out' then 'expense' else 'income' end;

create index transactions_category_idx on public.transactions (category_id);

-- The view selects t.category explicitly, so it has to be rebuilt before the
-- column can go.
drop view public.transactions_with_week;

alter table public.transactions drop column category;

create view public.transactions_with_week
with (security_invoker = true) as
select t.id,
       t.user_id,
       t.payer_id,
       t.account_id,
       t.occurred_on,
       t.direction,
       t.amount_minor,
       t.currency,
       t.fx_rate_etb_per_usd,
       t.amount_usd_minor,
       t.category_id,
       c.name as category_name,
       c.color as category_color,
       c.icon as category_icon,
       t.note,
       t.obligation_id,
       t.receipt_path,
       t.created_at,
       case
         when s.tracking_start_date is not null
           then floor((t.occurred_on - s.tracking_start_date)::numeric / 7.0)::integer + 1
         else null::integer
       end as week_number
from public.transactions t
left join public.settings s on s.user_id = t.user_id
left join public.categories c on c.id = t.category_id;

grant select on public.transactions_with_week to anon, authenticated, service_role;
