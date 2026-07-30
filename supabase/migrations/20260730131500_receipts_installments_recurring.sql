-- 1. Receipt attachments -------------------------------------------------
-- The private `receipts` bucket and its per-user-folder policies survived the
-- v3 reset (storage lives outside the `public` schema), so only the pointer
-- column is new. Paths are "<user_id>/<transaction_id>/<filename>", which is
-- what the existing storage policies key off.
alter table public.transactions add column receipt_path text;

-- 2. Installments --------------------------------------------------------
-- A *plan*, not a second ledger. Payments still link to the obligation as a
-- whole; which installment is settled/next is derived from cumulative amounts
-- versus what's actually been paid (see installment_progress below). Nothing
-- about "paid" is stored here, so it cannot drift out of sync with reality --
-- the same reasoning that kept obligations.status derived rather than stored.
create table public.obligation_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  obligation_id uuid not null references public.obligations(id) on delete cascade,
  seq int not null check (seq > 0),
  due_on date,
  amount_usd_minor bigint not null check (amount_usd_minor > 0),
  created_at timestamptz not null default now(),
  unique (obligation_id, seq)
);

create index obligation_installments_obligation_idx
  on public.obligation_installments (obligation_id, seq);

alter table public.obligation_installments enable row level security;

create policy obligation_installments_own on public.obligation_installments
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 3. Recurrence ----------------------------------------------------------
-- recur_spawned_at is the double-spawn guard: it records that this bill has
-- already produced its successor, so the daily job can never create two.
-- Same dedupe shape as v1's recurring-bill last_posted_date.
alter table public.obligations
  add column recur_interval_months int
    check (recur_interval_months is null or recur_interval_months > 0),
  add column recur_spawned_at timestamptz;

-- 4. Grants --------------------------------------------------------------
-- Recreating `public` in the v3 reset dropped Supabase's default grants, so
-- every new table needs them restated explicitly (the standing gotcha).
grant select, insert, update, delete on public.obligation_installments
  to anon, authenticated, service_role;

-- 5. Derived installment progress ---------------------------------------
-- Money columns coming out of obligation_progress are numeric (sum() promotes
-- them), so every figure is cast back to bigint on the way out -- the exact
-- mismatch that broke get_shared_snapshot's first version.
create view public.installment_progress
with (security_invoker = true) as
with cumulative as (
  select
    i.id,
    i.user_id,
    i.obligation_id,
    i.seq,
    i.due_on,
    i.amount_usd_minor,
    coalesce(
      sum(i.amount_usd_minor) over (
        partition by i.obligation_id
        order by i.seq
        rows between unbounded preceding and 1 preceding
      ),
      0
    ) as cumulative_before_minor
  from public.obligation_installments i
)
select
  c.id as installment_id,
  c.user_id,
  c.obligation_id,
  c.seq,
  c.due_on,
  c.amount_usd_minor::bigint as amount_usd_minor,
  c.cumulative_before_minor::bigint as cumulative_before_minor,
  greatest(
    least(
      c.amount_usd_minor,
      coalesce(op.amount_paid_usd_minor, 0) - c.cumulative_before_minor
    ),
    0
  )::bigint as amount_covered_minor,
  (coalesce(op.amount_paid_usd_minor, 0)
     >= c.cumulative_before_minor + c.amount_usd_minor) as is_settled,
  (c.due_on is not null
     and c.due_on < current_date
     and coalesce(op.amount_paid_usd_minor, 0)
           < c.cumulative_before_minor + c.amount_usd_minor) as is_past_due
from cumulative c
join public.obligation_progress op on op.obligation_id = c.obligation_id;

grant select on public.installment_progress to anon, authenticated, service_role;

-- 6. Recurring spawn job -------------------------------------------------
create function public.spawn_due_recurring_obligations()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    select o.* from public.obligations o
    where o.recur_interval_months is not null
      and o.recur_spawned_at is null
      and o.due_on is not null
      and o.due_on <= current_date
      and o.waived_at is null
  loop
    -- Per-row exception handling on purpose: this loop spans every user, and
    -- an uncaught error inside a plpgsql loop aborts the whole call. One bad
    -- row must not silently stop everyone else's bills from advancing (the
    -- exact failure mode v1's recurring auto-post hit).
    begin
      insert into public.obligations
        (user_id, payer_id, title, due_on, amount_usd_minor, source_note,
         recur_interval_months)
      values
        (r.user_id, r.payer_id, r.title,
         (r.due_on + make_interval(months => r.recur_interval_months))::date,
         r.amount_usd_minor, r.source_note, r.recur_interval_months);

      update public.obligations set recur_spawned_at = now() where id = r.id;
      v_count := v_count + 1;
    exception when others then
      null;
    end;
  end loop;
  return v_count;
end;
$$;

-- Cron-only: fired internally by the scheduler, never a client RPC.
revoke execute on function public.spawn_due_recurring_obligations() from public, anon, authenticated;

select cron.schedule(
  'spawn-recurring-obligations-daily',
  '0 5 * * *',
  $$select public.spawn_due_recurring_obligations()$$
);
