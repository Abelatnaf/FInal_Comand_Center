-- ============================================================
-- Multi-tenant conversion, part 1: schema restructure.
-- Adds user_id to every table, replaces hardcoded SoFi/Ally/Cash
-- balance columns with a generic accounts table, renames
-- VMI-specific columns to generic ones, relaxes payment_method
-- to free text. Abel's existing data is backfilled to his user_id
-- (25cdc7ca-c6a8-4708-9750-b937403531a4) so nothing is lost.
-- All 9 views are dropped here and recreated per-user in the
-- next migration.
-- ============================================================

drop view if exists public.semester_pacing;
drop view if exists public.net_worth_variance;
drop view if exists public.savings_goal_progress;
drop view if exists public.monthly_category_totals;
drop view if exists public.monthly_rollup;
drop view if exists public.weekly_rollup;
drop view if exists public.life_to_date_spend_by_category;
drop view if exists public.budget_vs_actual_this_month;
drop view if exists public.account_balance;

-- New: accounts (replaces settings.starting_sofi/ally/cash)
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  starting_balance numeric not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- New: net_worth_snapshot_balances (replaces sofi_actual/ally_actual/cash_actual)
create table public.net_worth_snapshot_balances (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.net_worth_snapshots(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  amount numeric not null default 0
);

-- ---- add user_id to every existing data table (nullable for now, backfill below) ----
alter table public.settings add column user_id uuid references auth.users(id) on delete cascade;
alter table public.categories add column user_id uuid references auth.users(id) on delete cascade;
alter table public.semesters add column user_id uuid references auth.users(id) on delete cascade;
alter table public.transactions add column user_id uuid references auth.users(id) on delete cascade;
alter table public.income add column user_id uuid references auth.users(id) on delete cascade;
alter table public.recurring_bills add column user_id uuid references auth.users(id) on delete cascade;
alter table public.savings_goals add column user_id uuid references auth.users(id) on delete cascade;
alter table public.net_worth_snapshots add column user_id uuid references auth.users(id) on delete cascade;
alter table public.key_dates add column user_id uuid references auth.users(id) on delete cascade;

-- ---- backfill: every existing row belongs to Abel, the only user so far ----
update public.settings set user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid;
update public.categories set user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid;
update public.semesters set user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid;
update public.transactions set user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid;
update public.income set user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid;
update public.recurring_bills set user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid;
update public.savings_goals set user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid;
update public.net_worth_snapshots set user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid;
update public.key_dates set user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid;

-- ---- migrate Abel's SoFi/Ally/Cash starting balances into accounts ----
insert into public.accounts (user_id, name, starting_balance, sort_order)
select '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid, 'SoFi', starting_sofi, 1
from public.settings where user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid
union all
select '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid, 'Ally', starting_ally, 2
from public.settings where user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid
union all
select '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid, 'Cash', starting_cash, 3
from public.settings where user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid;

-- ---- migrate Abel's existing net worth snapshot(s) into per-account balances ----
insert into public.net_worth_snapshot_balances (snapshot_id, account_id, amount)
select
  n.id,
  a.id,
  case a.name when 'SoFi' then n.sofi_actual when 'Ally' then n.ally_actual when 'Cash' then n.cash_actual end
from public.net_worth_snapshots n
cross join public.accounts a
where n.user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid
  and a.user_id = '25cdc7ca-c6a8-4708-9750-b937403531a4'::uuid;

-- ---- now make user_id required + self-filling everywhere ----
alter table public.settings alter column user_id set not null;
alter table public.categories alter column user_id set not null;
alter table public.semesters alter column user_id set not null;
alter table public.transactions alter column user_id set not null;
alter table public.income alter column user_id set not null;
alter table public.recurring_bills alter column user_id set not null;
alter table public.savings_goals alter column user_id set not null;
alter table public.net_worth_snapshots alter column user_id set not null;
alter table public.key_dates alter column user_id set not null;

alter table public.settings alter column user_id set default auth.uid();
alter table public.categories alter column user_id set default auth.uid();
alter table public.semesters alter column user_id set default auth.uid();
alter table public.transactions alter column user_id set default auth.uid();
alter table public.income alter column user_id set default auth.uid();
alter table public.recurring_bills alter column user_id set default auth.uid();
alter table public.savings_goals alter column user_id set default auth.uid();
alter table public.net_worth_snapshots alter column user_id set default auth.uid();
alter table public.key_dates alter column user_id set default auth.uid();

-- ---- settings: one row per user instead of a global singleton ----
alter table public.settings drop constraint settings_singleton;
alter table public.settings alter column id drop default;
alter table public.settings add constraint settings_user_unique unique (user_id);

alter table public.settings rename column matriculation_date to tracking_start_date;
alter table public.settings drop column starting_sofi;
alter table public.settings drop column starting_ally;
alter table public.settings drop column starting_cash;

-- ---- categories/semesters: name uniqueness is now per-user ----
alter table public.categories drop constraint categories_name_key;
alter table public.categories add constraint categories_user_name_unique unique (user_id, name);

alter table public.semesters drop constraint semesters_name_key;
alter table public.semesters add constraint semesters_user_name_unique unique (user_id, name);

-- ---- transactions/income: generic week numbering, free-text payment method ----
alter table public.transactions rename column cadet_week to week_number;
alter table public.income rename column cadet_week to week_number;
alter index transactions_cadet_week_idx rename to transactions_week_number_idx;
alter index income_cadet_week_idx rename to income_week_number_idx;

alter table public.transactions drop constraint transactions_payment_method_check;
alter table public.recurring_bills drop constraint recurring_bills_payment_method_check;

-- ---- net_worth_snapshots: drop the three hardcoded balance columns ----
alter table public.net_worth_snapshots drop column sofi_actual;
alter table public.net_worth_snapshots drop column ally_actual;
alter table public.net_worth_snapshots drop column cash_actual;
