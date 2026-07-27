-- Minimal settings table -- just the one fact needed for week-numbering.
-- Generic naming on purpose (tracking_start_date, not a VMI/cadet-specific
-- column name) even though the one real value happens to be Abel's actual
-- matriculation date.
create table public.settings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tracking_start_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

create index settings_user_idx on public.settings (user_id);

alter table public.settings enable row level security;
create policy settings_owner on public.settings for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- week_number is computed live, never stored -- it only depends on a
-- transaction's own occurred_on plus a start date that essentially never
-- changes, so there's no drift risk either way, and this avoids adding an
-- unrelated concern to the money-critical transactions trigger.
create view public.transactions_with_week
with (security_invoker = true) as
select
  t.*,
  case when s.tracking_start_date is not null
    then (floor((t.occurred_on - s.tracking_start_date) / 7.0)::int + 1)
    else null
  end as week_number
from public.transactions t
left join public.settings s on s.user_id = t.user_id;

do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'abelatnafu1@outlook.com';
  if v_user_id is null then
    raise exception 'Expected user not found -- seed skipped';
  end if;

  insert into public.settings (user_id, tracking_start_date) values (v_user_id, '2026-08-15');
end $$;
