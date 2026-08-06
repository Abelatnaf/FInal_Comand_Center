-- The posting function now creates the IOUs alongside the transaction.
--
-- This is the whole reason the template lives in the database: pg_cron calls
-- this function, and so does "Log now" in the UI. Putting the share creation
-- in a server action instead would have meant the cron-posted copy of your
-- rent silently had no shares on it.

create or replace function post_due_recurring_entries()
returns integer
language plpgsql
security definer
set search_path to ''
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

      -- Catch up a whole backlog in one run rather than one occurrence per
      -- daily run. The guard bounds a pathological date.
      while v_due <= current_date and v_guard < 120 loop
        if r.last_posted_on is null or r.last_posted_on < v_due then
          insert into public.transactions
            (user_id, account_id, occurred_on, direction, amount_minor, category_id, note)
          values
            (r.user_id, r.account_id, v_due, r.direction, r.amount_minor, r.category_id,
             coalesce(nullif(r.note, ''), r.name))
          returning id into v_tx_id;

          v_posted := v_posted + 1;

          -- Only an expense can be split -- an IOU against money you received
          -- is not a thing. The expense itself stays whole; a share sits
          -- beside it, which is the same model addSplit() uses by hand.
          if r.direction = 'out' then
            insert into public.split_shares
              (user_id, transaction_id, person, amount_minor)
            select r.user_id, v_tx_id, s.person,
                   (r.amount_minor * s.share_bp) / 10000
            from public.split_templates t
            join public.split_template_shares s on s.template_id = t.id
            where t.recurring_entry_id = r.id
              and (r.amount_minor * s.share_bp) / 10000 > 0;
          end if;
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
