-- sum()/round() on the underlying views promote to numeric, not bigint --
-- cast explicitly rather than leaving a type mismatch for callers.
--
-- NOTE: this migration's original apply also accidentally flipped the
-- function from security definer to security invoker while making this
-- fix -- corrected in the very next migration. Recorded here verbatim
-- (matching this project's real-applied-history discipline) rather than
-- silently rewritten.
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
security invoker
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
    lp.total_liquid_usd_minor::bigint,
    lp.fx_rate_effective_on,
    nd.title,
    pay.label,
    nd.amount_remaining_usd_minor::bigint,
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
