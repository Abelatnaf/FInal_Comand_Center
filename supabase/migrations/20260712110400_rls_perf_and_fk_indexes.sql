-- Wrap auth.uid() as (select auth.uid()) in every owner_all policy so
-- Postgres evaluates it once per query instead of once per row (standard
-- Supabase RLS performance guidance). Also add covering indexes for the
-- new user_id / account_id foreign keys.

drop policy "owner_all" on public.settings;
create policy "owner_all" on public.settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "owner_all" on public.categories;
create policy "owner_all" on public.categories for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "owner_all" on public.semesters;
create policy "owner_all" on public.semesters for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "owner_all" on public.transactions;
create policy "owner_all" on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "owner_all" on public.income;
create policy "owner_all" on public.income for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "owner_all" on public.recurring_bills;
create policy "owner_all" on public.recurring_bills for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "owner_all" on public.savings_goals;
create policy "owner_all" on public.savings_goals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "owner_all" on public.net_worth_snapshots;
create policy "owner_all" on public.net_worth_snapshots for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "owner_all" on public.key_dates;
create policy "owner_all" on public.key_dates for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "owner_all" on public.accounts;
create policy "owner_all" on public.accounts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "owner_all" on public.net_worth_snapshot_balances;
create policy "owner_all" on public.net_worth_snapshot_balances for all to authenticated
  using (exists (
    select 1 from public.net_worth_snapshots n
    where n.id = snapshot_id and n.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.net_worth_snapshots n
    where n.id = snapshot_id and n.user_id = (select auth.uid())
  ));

-- Covering indexes for the new foreign keys.
create index accounts_user_id_idx on public.accounts (user_id);
create index income_user_id_idx on public.income (user_id);
create index key_dates_user_id_idx on public.key_dates (user_id);
create index net_worth_snapshot_balances_account_id_idx on public.net_worth_snapshot_balances (account_id);
create index net_worth_snapshot_balances_snapshot_id_idx on public.net_worth_snapshot_balances (snapshot_id);
create index net_worth_snapshots_user_id_idx on public.net_worth_snapshots (user_id);
create index recurring_bills_category_id_idx on public.recurring_bills (category_id);
create index recurring_bills_user_id_idx on public.recurring_bills (user_id);
create index savings_goals_user_id_idx on public.savings_goals (user_id);
create index transactions_user_id_idx on public.transactions (user_id);
