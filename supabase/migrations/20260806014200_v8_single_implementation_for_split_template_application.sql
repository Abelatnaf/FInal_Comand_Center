-- "Log now" in the UI posted a recurring entry straight from a server action,
-- which would have bypassed the split template completely -- the cron-posted
-- copy of your rent would carry IOUs and the hand-posted copy would not.
--
-- Rather than copy the share logic into the action and hope the two stay in
-- step, both paths now go through the database, and the share creation itself
-- exists exactly once.

create or replace function apply_split_template(
  p_user_id uuid, p_tx_id uuid, p_entry_id uuid
) returns integer
language plpgsql security definer set search_path to '' as $$
declare v_count integer;
begin
  insert into public.split_shares (user_id, transaction_id, person, amount_minor)
  select p_user_id, p_tx_id, s.person, (re.amount_minor * s.share_bp) / 10000
  from public.split_templates t
  join public.split_template_shares s on s.template_id = t.id
  join public.recurring_entries re on re.id = t.recurring_entry_id
  where t.recurring_entry_id = p_entry_id
    and t.user_id = p_user_id
    -- Only an expense can be split; an IOU against money you received is not
    -- a thing.
    and re.direction = 'out'
    and (re.amount_minor * s.share_bp) / 10000 > 0;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function apply_split_template(uuid, uuid, uuid) from public, anon, authenticated;

-- The manual "Log now" path, moved out of the server action so it shares the
-- posting behaviour with cron instead of reimplementing it.
create or replace function post_recurring_entry_now(p_id uuid)
returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  v_user uuid := (select auth.uid());
  r record;
  v_tx_id uuid;
  v_next date;
begin
  if v_user is null then raise exception 'Must be signed in'; end if;

  select * into r from public.recurring_entries
  where id = p_id and user_id = v_user;
  if not found then raise exception 'That recurring entry no longer exists.'; end if;

  insert into public.transactions
    (user_id, account_id, occurred_on, direction, amount_minor, category_id, note)
  values
    (v_user, r.account_id, r.next_due_on, r.direction, r.amount_minor, r.category_id,
     coalesce(nullif(trim(r.note), ''), r.name))
  returning id into v_tx_id;

  perform public.apply_split_template(v_user, v_tx_id, r.id);

  v_next := (case r.cadence
    when 'weekly'    then r.next_due_on + interval '7 days'
    when 'monthly'   then r.next_due_on + interval '1 month'
    when 'quarterly' then r.next_due_on + interval '3 months'
    when 'yearly'    then r.next_due_on + interval '1 year'
  end)::date;

  update public.recurring_entries
  set last_posted_on = r.next_due_on, next_due_on = v_next
  where id = r.id;

  return jsonb_build_object('transaction_id', v_tx_id, 'next_due_on', v_next);
end;
$$;

revoke execute on function post_recurring_entry_now(uuid) from public, anon;
grant execute on function post_recurring_entry_now(uuid) to authenticated;

-- The cron path now calls the shared helper rather than inlining the insert.
create or replace function post_due_recurring_entries()
returns integer
language plpgsql security definer set search_path to ''
as $$
declare
  r record;
  v_posted integer := 0;
  v_due date;
  v_guard integer;
  v_tx_id uuid;
begin
  for r in
    select re.id, re.user_id, re.account_id, re.category_id, re.amount_minor,
           re.cadence, re.next_due_on, re.last_posted_on, re.name, re.note, re.direction
    from public.recurring_entries re
    where re.is_active and re.auto_post and re.next_due_on <= current_date
  loop
    -- Each row gets its own exception block. An uncaught error inside a
    -- plpgsql loop aborts the entire call, which is how v1 once silently
    -- skipped every user's recurring posts because of one bad row.
    begin
      v_due := r.next_due_on;
      v_guard := 0;

      while v_due <= current_date and v_guard < 120 loop
        if r.last_posted_on is null or r.last_posted_on < v_due then
          insert into public.transactions
            (user_id, account_id, occurred_on, direction, amount_minor, category_id, note)
          values
            (r.user_id, r.account_id, v_due, r.direction, r.amount_minor, r.category_id,
             coalesce(nullif(r.note, ''), r.name))
          returning id into v_tx_id;

          perform public.apply_split_template(r.user_id, v_tx_id, r.id);
          v_posted := v_posted + 1;
        end if;

        update public.recurring_entries
        set last_posted_on = v_due,
            next_due_on = (
              case cadence
                when 'weekly'    then v_due + interval '7 days'
                when 'monthly'   then v_due + interval '1 month'
                when 'quarterly' then v_due + interval '3 months'
                when 'yearly'    then v_due + interval '1 year'
              end
            )::date
        where id = r.id
        returning next_due_on into v_due;

        v_guard := v_guard + 1;
      end loop;
    exception when others then
      raise warning 'recurring entry % skipped: %', r.id, sqlerrm;
    end;
  end loop;

  return v_posted;
end;
$$;

revoke execute on function post_due_recurring_entries() from public, anon, authenticated;
