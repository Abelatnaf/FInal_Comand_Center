-- Moving money between your own accounts is not income and not spending.
-- Without a first-class concept for it, the only way to record a USD -> ETB
-- move is a fake expense plus a fake income, which inflates both totals and
-- corrupts every category and ledger figure derived from them.
--
-- Both sides of the amount are stored explicitly rather than deriving one
-- from the other via an exchange rate. For a cross-currency move you say
-- exactly what left and exactly what arrived, so the record is what actually
-- happened -- no inferred rate, and any spread or fee is simply visible as
-- the difference. Same-currency transfers usually have equal amounts, but
-- that is deliberately NOT enforced, since a wire fee legitimately makes them
-- differ.
create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_on date not null default current_date,
  from_account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid not null references public.accounts(id) on delete restrict,
  from_amount_minor bigint not null check (from_amount_minor > 0),
  to_amount_minor bigint not null check (to_amount_minor > 0),
  note text,
  created_at timestamptz not null default now(),
  constraint transfers_distinct_accounts check (from_account_id <> to_account_id)
);

create index transfers_user_idx on public.transfers (user_id);
create index transfers_from_idx on public.transfers (from_account_id);
create index transfers_to_idx on public.transfers (to_account_id);
create index transfers_occurred_idx on public.transfers (user_id, occurred_on desc);

alter table public.transfers enable row level security;

create policy transfers_own on public.transfers
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.transfers
  to anon, authenticated, service_role;

-- liquid_position reads balance_by_account, so it has to be dropped first and
-- rebuilt after. Its own definition is unchanged.
drop view public.liquid_position;
drop view public.balance_by_account;

-- Rewritten with scalar subqueries rather than joins: joining both
-- transactions and transfers would fan out the rows and double-count the
-- sums. Cast to bigint so the column keeps its money type rather than being
-- promoted to numeric by sum().
create view public.balance_by_account
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.currency,
  a.kind,
  a.is_archived,
  (
    a.opening_balance_minor
    + coalesce((
        select sum(case when t.direction = 'in' then t.amount_minor else -t.amount_minor end)
        from public.transactions t where t.account_id = a.id
      ), 0)
    - coalesce((
        select sum(tr.from_amount_minor)
        from public.transfers tr where tr.from_account_id = a.id
      ), 0)
    + coalesce((
        select sum(tr.to_amount_minor)
        from public.transfers tr where tr.to_account_id = a.id
      ), 0)
  )::bigint as balance_minor
from public.accounts a;

create view public.liquid_position
with (security_invoker = true) as
select
  b.user_id,
  case
    when bool_or(b.currency = 'ETB'::bpchar and r.etb_per_usd is null) then null::numeric
    else sum(
      case
        when b.currency = 'USD'::bpchar then b.balance_minor
        else round(b.balance_minor / r.etb_per_usd)
      end)
  end as total_liquid_usd_minor,
  max(r.effective_on) as fx_rate_effective_on,
  max(r.etb_per_usd) as fx_rate_used
from public.balance_by_account b
  left join lateral (
    select fr.etb_per_usd, fr.effective_on
    from public.fx_rates fr
    where fr.user_id = b.user_id
    order by fr.effective_on desc, fr.created_at desc
    limit 1
  ) r on true
where b.is_archived = false
group by b.user_id;

grant select on public.balance_by_account to anon, authenticated, service_role;
grant select on public.liquid_position to anon, authenticated, service_role;
