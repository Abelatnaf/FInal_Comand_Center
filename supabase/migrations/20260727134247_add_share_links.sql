-- Read-only share links (plan section 9, Phase 5 "resilience"). Sharing
-- stays read-only/tokenized, not a second real account (assumption A6) --
-- the token is unguessable (192 bits from gen_random_bytes) and the
-- security-definer function below only ever returns a narrow, specific
-- summary for the one user_id a valid token resolves to, never arbitrary
-- row access.
create table public.share_links (
  id text primary key default encode(gen_random_bytes(24), 'hex'),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index share_links_user_idx on public.share_links (user_id);

alter table public.share_links enable row level security;
create policy share_links_owner on public.share_links for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Deliberately narrow: next-due + coverage + balances only (what Now shows
-- above the fold), not the transaction list -- a share link is for "is this
-- covered," not a window into every purchase.
create or replace function public.get_shared_snapshot(p_token text)
returns table (
  found boolean,
  total_liquid_usd_minor bigint,
  fx_rate_effective_on date,
  next_due_title text,
  next_due_payer_label text,
  next_due_remaining_usd_minor bigint,
  next_due_days_until_due int,
  next_due_is_past_due boolean,
  balances jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
    from public.share_links
    where id = p_token and revoked_at is null;

  if v_user_id is null then
    return query select false, null::bigint, null::date, null::text, null::text, null::bigint, null::int, null::boolean, null::jsonb;
    return;
  end if;

  return query
  select
    true,
    lp.total_liquid_usd_minor,
    lp.fx_rate_effective_on,
    nd.title,
    pay.label,
    nd.amount_remaining_usd_minor,
    nd.days_until_due,
    nd.is_past_due,
    coalesce((
      select jsonb_agg(jsonb_build_object('name', b.name, 'currency', b.currency, 'balance_minor', b.balance_minor) order by b.kind, b.name)
      from public.balance_by_account b
      where b.user_id = v_user_id and b.is_archived = false
    ), '[]'::jsonb)
  from (select v_user_id as user_id) u
  left join public.liquid_position lp on lp.user_id = u.user_id
  left join lateral (
    select * from public.obligation_progress op
    where op.user_id = u.user_id and op.status in ('open', 'partial')
    order by (op.due_on is null), op.due_on asc
    limit 1
  ) nd on true
  left join public.payers pay on pay.id = nd.payer_id;
end;
$$;

revoke all on function public.get_shared_snapshot(text) from public;
grant execute on function public.get_shared_snapshot(text) to anon, authenticated;
