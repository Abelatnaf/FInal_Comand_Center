-- Split transactions: one purchase, several categories (a Target run is
-- rarely just "Shopping"). transactions.category_id stays as the default/
-- fallback; when splits exist for a transaction, the breakdown view uses
-- ONLY the splits and ignores the transaction's own category_id.

create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  category_id int references public.categories(id),
  amount_usd numeric not null check (amount_usd > 0),
  created_at timestamptz not null default now()
);

alter table public.transaction_splits enable row level security;
create policy "owner_all" on public.transaction_splits for all to authenticated
  using (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = (select auth.uid())));

create index transaction_splits_transaction_id_idx on public.transaction_splits (transaction_id);

create or replace view public.transaction_category_breakdown
with (security_invoker = true) as
select t.id as transaction_id, t.date, t.user_id, s.category_id, s.amount_usd, t.necessity
from public.transactions t
join public.transaction_splits s on s.transaction_id = t.id
union all
select t.id, t.date, t.user_id, t.category_id, t.amount_usd, t.necessity
from public.transactions t
where not exists (select 1 from public.transaction_splits s where s.transaction_id = t.id);

-- Rewire the three category-grouping views onto the breakdown so split
-- transactions get attributed correctly instead of all landing in
-- whichever category the transaction happened to keep as "primary".
create or replace view public.budget_vs_actual_this_month
with (security_invoker = true) as
select
  c.id as category_id,
  c.name as category,
  c.sort_order,
  c.monthly_budget as budget,
  coalesce(sum(b.amount_usd) filter (
    where date_trunc('month', b.date) = date_trunc('month', current_date)
  ), 0) as actual
from public.categories c
left join public.transaction_category_breakdown b on b.category_id = c.id
group by c.id, c.name, c.sort_order, c.monthly_budget
order by c.sort_order;

create or replace view public.life_to_date_spend_by_category
with (security_invoker = true) as
select
  c.id as category_id,
  c.name as category,
  c.sort_order,
  coalesce(sum(b.amount_usd), 0) as total
from public.categories c
left join public.transaction_category_breakdown b on b.category_id = c.id
group by c.id, c.name, c.sort_order
order by c.sort_order;

create or replace view public.monthly_category_totals
with (security_invoker = true) as
select
  date_trunc('month', b.date)::date as month,
  c.id as category_id,
  c.name as category,
  c.sort_order,
  sum(b.amount_usd) as total
from public.transaction_category_breakdown b
join public.categories c on c.id = b.category_id
group by 1, 2, 3, 4
order by 1, c.sort_order;
