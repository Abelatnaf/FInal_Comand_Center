-- Recurring expenses (subscriptions) and savings goals.
--
-- recurring_expenses deliberately stores no currency of its own: the charge
-- happens in whatever currency the account it hits is denominated in, and
-- transactions already enforce currency == account currency at the database
-- level. Deriving it removes the mismatch class entirely rather than adding
-- a second constraint to keep in sync.

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount_minor bigint not null check (amount_minor > 0),
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid not null references public.accounts(id) on delete restrict,
  payer_id uuid not null references public.payers(id) on delete restrict,
  cadence text not null check (cadence in ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_due_on date not null,
  -- When false the entry is tracked for the monthly-burn total but never
  -- writes a transaction on its own.
  auto_post boolean not null default true,
  is_active boolean not null default true,
  last_posted_on date,
  note text,
  created_at timestamptz not null default now()
);

create index recurring_expenses_user_idx on public.recurring_expenses (user_id);
create index recurring_expenses_account_idx on public.recurring_expenses (account_id);
create index recurring_expenses_payer_idx on public.recurring_expenses (payer_id);
create index recurring_expenses_category_idx on public.recurring_expenses (category_id);

alter table public.recurring_expenses enable row level security;

create policy recurring_expenses_own on public.recurring_expenses
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_minor bigint not null check (target_minor > 0),
  currency char(3) not null check (currency in ('USD', 'ETB')),
  target_date date,
  -- Linked: progress tracks that account's live balance. Unlinked: progress
  -- is the manual figure. Never both — a linked goal ignores the manual one.
  account_id uuid references public.accounts(id) on delete set null,
  saved_manual_minor bigint not null default 0 check (saved_manual_minor >= 0),
  note text,
  created_at timestamptz not null default now()
);

create index savings_goals_user_idx on public.savings_goals (user_id);
create index savings_goals_account_idx on public.savings_goals (account_id);

alter table public.savings_goals enable row level security;

create policy savings_goals_own on public.savings_goals
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.recurring_expenses to anon, authenticated, service_role;
grant select, insert, update, delete on public.savings_goals to anon, authenticated, service_role;

-- Progress is derived every read, never stored, so a linked goal can't drift
-- from the account it tracks.
create view public.savings_goal_progress
with (security_invoker = true) as
select g.id,
       g.user_id,
       g.name,
       g.target_minor,
       g.currency,
       g.target_date,
       g.account_id,
       g.note,
       g.created_at,
       a.name as account_name,
       coalesce(
         case when g.account_id is not null then greatest(b.balance_minor, 0) end,
         g.saved_manual_minor
       )::bigint as saved_minor,
       greatest(
         g.target_minor - coalesce(
           case when g.account_id is not null then greatest(b.balance_minor, 0) end,
           g.saved_manual_minor
         ),
         0
       )::bigint as remaining_minor,
       case
         when g.target_date is not null then (g.target_date - current_date)
         else null::integer
       end as days_until_target
from public.savings_goals g
left join public.accounts a on a.id = g.account_id
left join public.balance_by_account b on b.account_id = g.account_id;

grant select on public.savings_goal_progress to anon, authenticated, service_role;
