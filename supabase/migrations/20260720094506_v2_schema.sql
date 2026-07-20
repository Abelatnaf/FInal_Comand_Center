-- Command Deck v2: minimal schema. One unified `entries` table replaces
-- the old separate transactions/income/transfers/recurring_bills/recurring_income.

create table public.settings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  currency_code text not null default 'USD',
  low_balance_threshold numeric,
  created_at timestamptz not null default now(),
  unique (user_id)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'asset' check (kind in ('asset', 'liability')),
  starting_balance numeric not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  monthly_budget numeric not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  type text not null check (type in ('expense', 'income', 'transfer')),
  amount numeric not null check (amount > 0),
  account_id uuid references public.accounts(id) on delete set null,
  to_account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  description text not null default '',
  notes text,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  check (type <> 'transfer' or to_account_id is not null)
);
create index entries_user_date_idx on public.entries (user_id, date desc);
create index entries_user_recurring_idx on public.entries (user_id, is_recurring) where is_recurring;

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  target_date date,
  account_id uuid references public.accounts(id) on delete set null,
  saved_so_far numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.settings enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.entries enable row level security;
alter table public.savings_goals enable row level security;

create policy settings_owner on public.settings for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy accounts_owner on public.accounts for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy categories_owner on public.categories for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy entries_owner on public.entries for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy savings_goals_owner on public.savings_goals for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Live net worth: no manual snapshots. Sum of asset balances minus liability balances,
-- where each account's live balance = starting_balance + income - expenses (+/- transfers).
create view public.account_balance
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.kind,
  a.starting_balance
    + coalesce((select sum(e.amount) from public.entries e where e.account_id = a.id and e.type = 'income'), 0)
    - coalesce((select sum(e.amount) from public.entries e where e.account_id = a.id and e.type = 'expense'), 0)
    - coalesce((select sum(e.amount) from public.entries e where e.account_id = a.id and e.type = 'transfer'), 0)
    + coalesce((select sum(e.amount) from public.entries e where e.to_account_id = a.id and e.type = 'transfer'), 0)
    as balance
from public.accounts a;

create view public.budget_vs_actual_this_month
with (security_invoker = true) as
select
  c.id as category_id,
  c.user_id,
  c.name,
  c.monthly_budget,
  coalesce((
    select sum(e.amount) from public.entries e
    where e.category_id = c.id and e.type = 'expense'
      and date_trunc('month', e.date) = date_trunc('month', current_date)
  ), 0) as actual_spent
from public.categories c;

-- Auto-provision a new user with a starter account and default categories.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.settings (user_id) values (new.id);

  insert into public.accounts (user_id, name, kind, starting_balance, sort_order) values
    (new.id, 'Checking', 'asset', 0, 0),
    (new.id, 'Savings', 'asset', 0, 1);

  insert into public.categories (user_id, name, monthly_budget, sort_order) values
    (new.id, 'Housing', 0, 0),
    (new.id, 'Food & Dining', 0, 1),
    (new.id, 'Transportation', 0, 2),
    (new.id, 'Shopping', 0, 3),
    (new.id, 'Entertainment', 0, 4),
    (new.id, 'Health & Medical', 0, 5),
    (new.id, 'Subscriptions', 0, 6),
    (new.id, 'Other', 0, 7);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
