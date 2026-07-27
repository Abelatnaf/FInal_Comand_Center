-- v3 schema: payers, accounts, fx_rates, obligations, transactions.
-- Money is stored in minor units (bigint) -- never floats. The FX rate is
-- frozen at write time and never recomputed on edit unless the currency
-- selection itself changes -- this is the exact correctness bug v3 exists
-- to fix (see CLAUDE.md v3 plan, section 5).

create table public.payers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  label text not null,
  class_year int,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency char(3) not null check (currency in ('ETB', 'USD')),
  kind text not null check (kind in ('bank', 'cash', 'processor')),
  opening_balance_minor bigint not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.fx_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_on date not null,
  etb_per_usd numeric(12,4) not null check (etb_per_usd > 0),
  source text not null check (source in ('official', 'parallel', 'manual')),
  created_at timestamptz not null default now(),
  unique (user_id, effective_on, source)
);

create table public.obligations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payer_id uuid not null references public.payers(id) on delete restrict,
  title text not null,
  due_on date,
  amount_usd_minor bigint not null check (amount_usd_minor >= 0),
  source_note text,
  waived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payer_id uuid not null references public.payers(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  occurred_on date not null default current_date,
  direction text not null check (direction in ('in', 'out')),
  amount_minor bigint not null check (amount_minor > 0),
  currency char(3) not null check (currency in ('ETB', 'USD')),
  fx_rate_etb_per_usd numeric(12,4) not null check (fx_rate_etb_per_usd > 0),
  amount_usd_minor bigint not null check (amount_usd_minor >= 0),
  category text,
  note text,
  obligation_id uuid references public.obligations(id) on delete set null,
  created_at timestamptz not null default now()
);

create index payers_user_idx on public.payers (user_id);
create index accounts_user_idx on public.accounts (user_id);
create index fx_rates_user_idx on public.fx_rates (user_id);
create index fx_rates_effective_idx on public.fx_rates (user_id, effective_on desc, created_at desc);
create index obligations_user_idx on public.obligations (user_id);
create index obligations_payer_idx on public.obligations (payer_id);
create index transactions_user_idx on public.transactions (user_id);
create index transactions_payer_occurred_idx on public.transactions (payer_id, occurred_on desc);
create index transactions_obligation_idx on public.transactions (obligation_id);
create index transactions_account_idx on public.transactions (account_id);

alter table public.payers enable row level security;
alter table public.accounts enable row level security;
alter table public.fx_rates enable row level security;
alter table public.obligations enable row level security;
alter table public.transactions enable row level security;

create policy payers_owner on public.payers for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy accounts_owner on public.accounts for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy fx_rates_owner on public.fx_rates for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy obligations_owner on public.obligations for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy transactions_owner on public.transactions for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Freeze the FX rate + derived USD figure at write time. Reuse the existing
-- frozen rate on UPDATE unless the currency selection itself changes -- a
-- naive "recompute on every save" is exactly what broke v1's numbers.
create or replace function public.set_transaction_computed_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account_currency char(3);
  v_rate numeric(12,4);
begin
  select currency into v_account_currency
    from public.accounts where id = new.account_id;

  if v_account_currency is null then
    raise exception 'Account not found';
  end if;

  if new.currency <> v_account_currency then
    raise exception 'Transaction currency (%) must match account currency (%)',
      new.currency, v_account_currency;
  end if;

  if tg_op = 'UPDATE' and old.currency = new.currency then
    new.fx_rate_etb_per_usd := old.fx_rate_etb_per_usd;
  else
    select etb_per_usd into v_rate
      from public.fx_rates
      where user_id = new.user_id
      order by effective_on desc, created_at desc
      limit 1;

    if v_rate is null then
      raise exception 'Set an FX rate in Settings before logging a transaction';
    end if;

    new.fx_rate_etb_per_usd := v_rate;
  end if;

  if new.currency = 'USD' then
    new.amount_usd_minor := new.amount_minor;
  else
    new.amount_usd_minor := round(new.amount_minor / new.fx_rate_etb_per_usd);
  end if;

  return new;
end;
$$;

create trigger transactions_set_computed_fields
  before insert or update on public.transactions
  for each row execute function public.set_transaction_computed_fields();

-- Derived values (plan section 4) -- computed live in views, never cached
-- or recomputed client-side, and never using today's rate for anything
-- historical.

create view public.balance_by_account
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.currency,
  a.kind,
  a.is_archived,
  a.opening_balance_minor
    + coalesce(sum(case when t.direction = 'in' then t.amount_minor else 0 end), 0)
    - coalesce(sum(case when t.direction = 'out' then t.amount_minor else 0 end), 0)
    as balance_minor
from public.accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

create view public.obligation_progress
with (security_invoker = true) as
select
  o.id as obligation_id,
  o.user_id,
  o.payer_id,
  o.title,
  o.due_on,
  o.amount_usd_minor,
  o.source_note,
  o.waived_at,
  coalesce(paid.amount_paid_usd_minor, 0) as amount_paid_usd_minor,
  greatest(o.amount_usd_minor - coalesce(paid.amount_paid_usd_minor, 0), 0) as amount_remaining_usd_minor,
  case
    when o.waived_at is not null then 'waived'
    when coalesce(paid.amount_paid_usd_minor, 0) >= o.amount_usd_minor then 'paid'
    when coalesce(paid.amount_paid_usd_minor, 0) > 0 then 'partial'
    else 'open'
  end as status,
  (o.waived_at is null
    and o.due_on is not null
    and o.due_on < current_date
    and coalesce(paid.amount_paid_usd_minor, 0) < o.amount_usd_minor) as is_past_due,
  (o.due_on - current_date) as days_until_due
from public.obligations o
left join (
  select obligation_id, sum(amount_usd_minor) as amount_paid_usd_minor
  from public.transactions
  where obligation_id is not null and direction = 'out'
  group by obligation_id
) paid on paid.obligation_id = o.id;

-- Total liquid USD-equivalent across non-archived accounts, at the current
-- manually-set rate. If any ETB balance can't be converted (no rate set
-- yet), the total is NULL rather than silently omitting that balance --
-- an understated-but-confident number would itself be a "lie about money".
create view public.liquid_position
with (security_invoker = true) as
select
  b.user_id,
  case
    when bool_or(b.currency = 'ETB' and r.etb_per_usd is null) then null
    else sum(
      case when b.currency = 'USD' then b.balance_minor
      else round(b.balance_minor / r.etb_per_usd)
      end
    )
  end as total_liquid_usd_minor,
  max(r.effective_on) as fx_rate_effective_on,
  max(r.etb_per_usd) as fx_rate_used
from public.balance_by_account b
left join lateral (
  select etb_per_usd, effective_on
  from public.fx_rates fr
  where fr.user_id = b.user_id
  order by fr.effective_on desc, fr.created_at desc
  limit 1
) r on true
where b.is_archived = false
group by b.user_id;
