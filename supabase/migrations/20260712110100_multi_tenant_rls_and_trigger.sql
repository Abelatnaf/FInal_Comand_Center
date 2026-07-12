-- ============================================================
-- Multi-tenant conversion, part 2: RLS rewrite + insert trigger.
-- Every policy now scopes to auth.uid() = user_id instead of
-- using(true) for any authenticated user.
-- ============================================================

-- ---- drop the old single-tenant policies ----
drop policy "authenticated_all" on public.settings;
drop policy "authenticated_all" on public.categories;
drop policy "authenticated_all" on public.semesters;
drop policy "authenticated_all" on public.transactions;
drop policy "authenticated_all" on public.income;
drop policy "authenticated_all" on public.recurring_bills;
drop policy "authenticated_all" on public.savings_goals;
drop policy "authenticated_all" on public.net_worth_snapshots;
drop policy "authenticated_all" on public.key_dates;

-- ---- per-user policies on existing tables ----
create policy "owner_all" on public.settings for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on public.categories for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on public.semesters for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on public.transactions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on public.income for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on public.recurring_bills for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on public.savings_goals for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on public.net_worth_snapshots for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on public.key_dates for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- RLS on the two new tables ----
alter table public.accounts enable row level security;
create policy "owner_all" on public.accounts for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.net_worth_snapshot_balances enable row level security;
create policy "owner_all" on public.net_worth_snapshot_balances for all to authenticated
  using (exists (
    select 1 from public.net_worth_snapshots n
    where n.id = snapshot_id and n.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.net_worth_snapshots n
    where n.id = snapshot_id and n.user_id = auth.uid()
  ));

-- ---- rewrite the insert trigger for per-user settings + renamed columns ----
create or replace function public.set_computed_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tracking_start_date date;
  v_fx_rate numeric;
begin
  select tracking_start_date, fx_rate into v_tracking_start_date, v_fx_rate
  from public.settings where user_id = new.user_id;

  new.week_number := floor((new.date - v_tracking_start_date) / 7.0)::int + 1;

  if new.currency = 'USD' then
    new.amount_usd := new.amount_original;
  else
    new.amount_usd := round(new.amount_original / v_fx_rate, 2);
  end if;

  return new;
end;
$$;
