-- v7: recurring entries carry a direction, so income can recur too.
--
-- Renaming rather than adding a second table: the posting machinery, cadence
-- handling, catch-up loop and per-row exception guard are all direction-agnostic
-- already, and a table called `recurring_expenses` holding a paycheck would be
-- the same kind of lie `monthly_budget_usd_minor` was before v6 renamed it.

alter table recurring_expenses rename to recurring_entries;

alter table recurring_entries
  add column direction text not null default 'out'
    check (direction in ('in', 'out'));

drop function if exists post_due_recurring_expenses() cascade;

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
             coalesce(nullif(r.note, ''), r.name));
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

-- The scheduler runs as postgres, which owns the function, so the revoke above
-- does not block it.
select cron.unschedule('post-due-recurring-expenses')
where exists (select 1 from cron.job where jobname = 'post-due-recurring-expenses');

select cron.schedule(
  'post-due-recurring-entries',
  '10 5 * * *',
  $cron$select public.post_due_recurring_entries()$cron$
);
