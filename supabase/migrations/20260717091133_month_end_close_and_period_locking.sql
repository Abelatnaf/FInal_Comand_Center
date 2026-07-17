-- Month-end close: reconcile each asset account against its real statement
-- balance, then lock the period so past history can't be silently edited.
-- Liability accounts are intentionally excluded from the computed-balance
-- side of this (see account_balance_as_of() below) — matches the existing,
-- deliberate design choice in account_balances that a transaction tagged to
-- a liability account is ambiguous (a charge vs. a payment both just look
-- like "a transaction"), so this app has never computed live liability
-- balances anywhere, only tracked them via manual net-worth-snapshot entries.
-- Reconciliation for liabilities follows that same existing precedent:
-- statement balance recorded manually, no computed comparison invented.

create table public.period_closes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  period_month date not null,
  status text not null default 'reconciling' check (status in ('reconciling', 'closed')),
  closed_at timestamptz,
  reopen_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_month)
);

create table public.period_close_accounts (
  id uuid primary key default gen_random_uuid(),
  period_close_id uuid not null references public.period_closes(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  statement_balance numeric,
  computed_balance numeric,
  reconciled boolean not null default false,
  unique (period_close_id, account_id)
);

alter table public.period_closes enable row level security;
alter table public.period_close_accounts enable row level security;

create policy owner_all on public.period_closes
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy owner_all on public.period_close_accounts
  for all
  using (exists (
    select 1 from public.period_closes pc
    where pc.id = period_close_accounts.period_close_id and pc.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.period_closes pc
    where pc.id = period_close_accounts.period_close_id and pc.user_id = (select auth.uid())
  ));

create index period_closes_user_id_idx on public.period_closes(user_id);
create index period_close_accounts_period_close_id_idx on public.period_close_accounts(period_close_id);
create index period_close_accounts_account_id_idx on public.period_close_accounts(account_id);

-- Reuses the existing generic audit trigger — a period being closed or
-- reopened (with its reason) is exactly the kind of change this table
-- exists to make visible, same reasoning as every other audited table.
create trigger audit_period_closes
  after insert or update or delete on public.period_closes
  for each row execute function public.log_audit_change();

-- Asset-account balance as of a specific date, for reconciling a given
-- month rather than "right now." Mirrors account_balances' exact formula
-- (same tables, same signs) with a date cutoff added. security invoker —
-- it only ever reads rows RLS already lets the caller see, no elevation
-- needed. Returns null for a liability account (deliberately, see above)
-- or an account belonging to someone else (RLS on accounts hides the row).
create or replace function public.account_balance_as_of(p_account_id uuid, p_as_of date)
returns numeric
language sql
security invoker
stable
as $$
  select
    a.starting_balance
    + coalesce((select sum(i.amount_usd) from public.income i where i.account_id = a.id and i.date <= p_as_of), 0)
    - coalesce((select sum(t.amount_usd) from public.transactions t where t.account_id = a.id and t.date <= p_as_of), 0)
    + coalesce((select sum(tr.amount_usd) from public.transfers tr where tr.to_account_id = a.id and tr.date <= p_as_of), 0)
    - coalesce((select sum(tr.amount_usd) from public.transfers tr where tr.from_account_id = a.id and tr.date <= p_as_of), 0)
  from public.accounts a
  where a.id = p_account_id and a.kind = 'asset';
$$;

-- Period lock enforcement: block insert/update/delete on transactions,
-- income, and transfers when the row's date (old or new, for updates —
-- can't move an entry into OR out of a closed period) falls in a month
-- that's currently closed for that user. Not security definer — it only
-- ever reads the acting user's own period_closes rows, which their
-- existing RLS policy already lets them see, so invoker rights suffice.
create or replace function public.check_period_not_closed()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_check_dates date[];
  v_closed_month date;
begin
  if tg_op = 'DELETE' then
    v_user_id := old.user_id;
    v_check_dates := array[date_trunc('month', old.date)::date];
  elsif tg_op = 'UPDATE' then
    v_user_id := new.user_id;
    v_check_dates := array[date_trunc('month', old.date)::date, date_trunc('month', new.date)::date];
  else
    v_user_id := new.user_id;
    v_check_dates := array[date_trunc('month', new.date)::date];
  end if;

  select period_month into v_closed_month
  from public.period_closes
  where user_id = v_user_id
    and status = 'closed'
    and period_month = any(v_check_dates)
  limit 1;

  if v_closed_month is not null then
    raise exception 'The period % is closed. Reopen it on the Month-End Close page before editing.', to_char(v_closed_month, 'Mon YYYY');
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_check_period_not_closed
  before insert or update or delete on public.transactions
  for each row execute function public.check_period_not_closed();

create trigger trg_check_period_not_closed
  before insert or update or delete on public.income
  for each row execute function public.check_period_not_closed();

create trigger trg_check_period_not_closed
  before insert or update or delete on public.transfers
  for each row execute function public.check_period_not_closed();
