-- Multi-currency support: replace the hardcoded USD/ETB pair (a single
-- settings.fx_rate) with a per-user currencies table, so a user can track
-- any number of non-USD currencies, each with its own rate.

create table public.currencies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  rate_to_usd numeric not null check (rate_to_usd > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, code)
);

alter table public.currencies enable row level security;

create policy "currencies_all" on public.currencies
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index currencies_user_id_idx on public.currencies (user_id);

-- Backfill: every existing settings row with a customized fx_rate was using
-- it as an implicit "ETB" secondary-currency rate (the old currency picker
-- was hardcoded to USD/ETB) -- preserve that as a real currencies row.
insert into public.currencies (user_id, code, name, rate_to_usd, sort_order)
select user_id, 'ETB', 'Ethiopian Birr', fx_rate, 0
from public.settings
where fx_rate is distinct from 1;

-- New signups no longer need a seeded fx_rate -- USD is the implicit base
-- (rate 1) and users add their own currencies from Settings.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.settings (user_id, tracking_start_date)
  values (new.id, current_date);

  insert into public.accounts (user_id, name, starting_balance, sort_order) values
    (new.id, 'Checking', 0, 1),
    (new.id, 'Savings', 0, 2),
    (new.id, 'Cash', 0, 3);

  insert into public.categories (user_id, name, monthly_budget, sort_order) values
    (new.id, 'Housing', 0, 1),
    (new.id, 'Food & Dining', 0, 2),
    (new.id, 'Transportation', 0, 3),
    (new.id, 'Personal Care', 0, 4),
    (new.id, 'Entertainment', 0, 5),
    (new.id, 'Shopping', 0, 6),
    (new.id, 'Health & Medical', 0, 7),
    (new.id, 'Subscriptions', 0, 8),
    (new.id, 'Travel', 0, 9),
    (new.id, 'Other', 0, 10);

  return new;
end;
$$;

-- Rewrite the computed-fields trigger to look up the rate for whatever
-- currency code was submitted (from this user's own currencies table)
-- instead of a single fixed settings.fx_rate. USD stays the implicit,
-- always-available base at rate 1.
create or replace function public.set_computed_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_tracking_start_date date;
  v_rate numeric;
begin
  select tracking_start_date into v_tracking_start_date
  from public.settings where user_id = new.user_id;

  new.week_number := floor((new.date - v_tracking_start_date) / 7.0)::int + 1;

  if tg_op = 'INSERT' then
    if new.currency = 'USD' then
      v_rate := 1;
    else
      select rate_to_usd into v_rate
      from public.currencies
      where user_id = new.user_id and code = new.currency;

      if v_rate is null then
        raise exception 'Unknown currency % -- add it in Settings first', new.currency;
      end if;
    end if;
    new.fx_rate_used := v_rate;
  else
    -- Preserve the rate locked in at insert time. Editing the amount or
    -- currency later must not re-price the transaction at today's rate.
    new.fx_rate_used := old.fx_rate_used;
  end if;

  if new.currency = 'USD' then
    new.amount_usd := new.amount_original;
  else
    new.amount_usd := round(new.amount_original / new.fx_rate_used, 2);
  end if;

  return new;
end;
$function$;

-- currency is now free text validated at the UI level against the user's
-- own currencies table (+ the always-available "USD"), same relaxation
-- already applied to payment_method during the multi-tenant conversion.
alter table public.transactions drop constraint if exists transactions_currency_check;
alter table public.income drop constraint if exists income_currency_check;

alter table public.settings drop column fx_rate;
