-- Transfers: moving money between your own accounts (Checking -> Savings)
-- is neither income nor an expense. Without a dedicated record for it,
-- people fake transfers as an expense in one account + income in the
-- other, which inflates both totals and every chart derived from them.

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  date date not null,
  from_account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id uuid not null references public.accounts(id) on delete cascade,
  amount_usd numeric not null check (amount_usd > 0),
  notes text,
  created_at timestamptz not null default now(),
  constraint transfers_different_accounts check (from_account_id <> to_account_id)
);

alter table public.transfers enable row level security;
create policy "owner_all" on public.transfers for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create index transfers_user_id_idx on public.transfers (user_id);
create index transfers_date_idx on public.transfers (date);
create index transfers_from_account_idx on public.transfers (from_account_id);
create index transfers_to_account_idx on public.transfers (to_account_id);

-- Liabilities: net worth is assets MINUS liabilities. Accounts were
-- asset-only (checking/savings/cash); a credit card or loan balance had
-- nowhere to live, so net worth was really just "cash on hand".
alter table public.accounts add column kind text not null default 'asset' check (kind in ('asset', 'liability'));

-- account_balance: liability starting balances subtract instead of add.
create or replace view public.account_balance
with (security_invoker = true) as
select
  (select coalesce(sum(case when kind = 'liability' then -starting_balance else starting_balance end), 0) from public.accounts) as starting_total,
  coalesce((select sum(amount_usd) from public.income), 0) as total_income,
  coalesce((select sum(amount_usd) from public.transactions), 0) as total_expenses,
  (select coalesce(sum(case when kind = 'liability' then -starting_balance else starting_balance end), 0) from public.accounts)
    + coalesce((select sum(amount_usd) from public.income), 0)
    - coalesce((select sum(amount_usd) from public.transactions), 0) as current_balance;

-- net_worth_variance: same sign-flip on both the actual snapshot total and the computed comparison.
create or replace view public.net_worth_variance
with (security_invoker = true) as
with base as (
  select
    n.id,
    n.snapshot_date,
    n.notes,
    coalesce((
      select sum(case when a.kind = 'liability' then -b.amount else b.amount end)
      from public.net_worth_snapshot_balances b
      join public.accounts a on a.id = b.account_id
      where b.snapshot_id = n.id
    ), 0) as total_actual,
    (select coalesce(sum(case when kind = 'liability' then -starting_balance else starting_balance end), 0) from public.accounts)
      + coalesce((select sum(amount_usd) from public.income where date <= n.snapshot_date), 0)
      - coalesce((select sum(amount_usd) from public.transactions where date <= n.snapshot_date), 0)
      as computed_balance
  from public.net_worth_snapshots n
)
select *, total_actual - computed_balance as variance
from base
order by snapshot_date;
