-- Push subscriptions, so a bill can reach you when the app is closed.
--
-- One row per browser/device, keyed on the endpoint the push service hands
-- out. The endpoint is globally unique by construction, which is what makes
-- re-subscribing idempotent rather than piling up dead rows.

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  -- The two keys from PushSubscription.getKey(), base64url. Stored as given;
  -- the send side needs them verbatim to encrypt the payload.
  p256dh text not null,
  auth text not null,
  -- Lets a device stop being notified without forgetting it exists, and
  -- records when the browser last accepted a message.
  is_active boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy push_subscriptions_own on push_subscriptions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on push_subscriptions to authenticated;

-- Who is due what, in the window Home already uses for "coming up". Defined
-- here rather than assembled in the send route so the reminder and the screen
-- can never disagree about what counts as due soon.
create or replace function due_reminders(p_days integer default 14)
returns table (
  user_id uuid,
  title text,
  due_on date,
  amount_minor bigint,
  kind text
)
language sql
security definer
set search_path to ''
as $$
  select op.user_id, op.title, op.due_on,
         op.amount_remaining_usd_minor::bigint, 'bill'::text
  from public.obligation_progress op
  where op.status in ('open', 'partial')
    and op.due_on is not null
    and op.due_on <= current_date + p_days

  union all

  select re.user_id, re.name, re.next_due_on, re.amount_minor, 'recurring'::text
  from public.recurring_entries re
  where re.is_active
    and re.direction = 'out'
    and re.next_due_on <= current_date + p_days

  order by 3;
$$;

-- The send route runs as the service role, which is not a client role.
revoke execute on function due_reminders(integer) from public, anon, authenticated;
grant execute on function due_reminders(integer) to service_role;
