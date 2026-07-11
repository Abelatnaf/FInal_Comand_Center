-- Categories: real lookup table (not a bare enum) because Command Deck's
-- Budget vs Actual panel needs a per-category monthly_budget.
create table public.categories (
  id serial primary key,
  name text not null unique,
  monthly_budget numeric not null default 0,
  sort_order int not null
);

-- Single settings row (fx rate, matriculation date, starting balances).
-- Only SoFi/Ally/Cash hold balances -- Payoneer is payment-method-only,
-- confirmed against the real xlsx Settings/Net Worth tabs.
create table public.settings (
  id int primary key default 1,
  fx_rate numeric not null default 180,
  matriculation_date date not null default '2026-08-15',
  starting_sofi numeric not null default 0,
  starting_ally numeric not null default 0,
  starting_cash numeric not null default 0,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

create table public.semesters (
  id serial primary key,
  name text not null unique,
  start_date date not null,
  end_date date not null
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  cadet_week int,
  category_id int references public.categories(id),
  description text,
  necessity text check (necessity in ('Necessary', 'Discretionary')),
  is_recurring boolean not null default false,
  currency text not null check (currency in ('USD', 'ETB')),
  amount_original numeric not null,
  amount_usd numeric,
  payment_method text check (
    payment_method in ('SoFi Debit', 'Ally', 'Payoneer', 'Cash', 'VMI Cadet Store Charge', 'Other')
  ),
  notes text,
  created_at timestamptz not null default now()
);

create index transactions_date_idx on public.transactions (date);
create index transactions_cadet_week_idx on public.transactions (cadet_week);
create index transactions_category_idx on public.transactions (category_id);

create table public.income (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  cadet_week int,
  source text,
  currency text not null check (currency in ('USD', 'ETB')),
  amount_original numeric not null,
  amount_usd numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index income_date_idx on public.income (date);
create index income_cadet_week_idx on public.income (cadet_week);

create table public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id int references public.categories(id),
  monthly_cost_usd numeric not null,
  billing_day int check (billing_day between 1 and 31),
  payment_method text check (
    payment_method in ('SoFi Debit', 'Ally', 'Payoneer', 'Cash', 'VMI Cadet Store Charge', 'Other')
  ),
  active boolean not null default true
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount_usd numeric not null,
  target_date date,
  saved_so_far_usd numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  sofi_actual numeric not null default 0,
  ally_actual numeric not null default 0,
  cash_actual numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- window_label is free text (e.g. "Late Nov 2026") because most real key dates
-- are estimated ranges, not exact ISO dates -- confirmed against the xlsx.
-- Named window_label, not window, because WINDOW is a reserved word in Postgres.
create table public.key_dates (
  id serial primary key,
  event text not null,
  window_label text not null,
  status text not null,
  budget_note text,
  sort_order int not null
);

-- Locks in cadet_week + amount_usd at insert time using the settings row
-- active at that moment, so later fx_rate edits never rewrite history.
create or replace function public.set_computed_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matriculation_date date;
  v_fx_rate numeric;
begin
  select matriculation_date, fx_rate into v_matriculation_date, v_fx_rate
  from public.settings where id = 1;

  new.cadet_week := floor((new.date - v_matriculation_date) / 7.0)::int + 1;

  if new.currency = 'USD' then
    new.amount_usd := new.amount_original;
  else
    new.amount_usd := round(new.amount_original / v_fx_rate, 2);
  end if;

  return new;
end;
$$;

create trigger trg_transactions_computed
before insert or update of date, currency, amount_original on public.transactions
for each row execute function public.set_computed_fields();

create trigger trg_income_computed
before insert or update of date, currency, amount_original on public.income
for each row execute function public.set_computed_fields();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_settings_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

-- Single-user app, no public signup -- any authenticated session is the owner.
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.semesters enable row level security;
alter table public.transactions enable row level security;
alter table public.income enable row level security;
alter table public.recurring_bills enable row level security;
alter table public.savings_goals enable row level security;
alter table public.net_worth_snapshots enable row level security;
alter table public.key_dates enable row level security;

create policy "authenticated_all" on public.settings for all to authenticated using (true) with check (true);
create policy "authenticated_all" on public.categories for all to authenticated using (true) with check (true);
create policy "authenticated_all" on public.semesters for all to authenticated using (true) with check (true);
create policy "authenticated_all" on public.transactions for all to authenticated using (true) with check (true);
create policy "authenticated_all" on public.income for all to authenticated using (true) with check (true);
create policy "authenticated_all" on public.recurring_bills for all to authenticated using (true) with check (true);
create policy "authenticated_all" on public.savings_goals for all to authenticated using (true) with check (true);
create policy "authenticated_all" on public.net_worth_snapshots for all to authenticated using (true) with check (true);
create policy "authenticated_all" on public.key_dates for all to authenticated using (true) with check (true);
