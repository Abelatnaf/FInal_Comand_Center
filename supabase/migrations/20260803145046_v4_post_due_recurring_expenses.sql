-- Writes a real transaction for every recurring expense whose due date has
-- arrived, then advances it to its next date. The transaction goes through
-- the normal insert path, so set_transaction_computed_fields() freezes the
-- rate exactly as it would for a hand-entered row.

create or replace function public.post_due_recurring_expenses()
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
    select re.id, re.user_id, re.payer_id, re.account_id, re.category_id,
           re.amount_minor, re.cadence, re.next_due_on, re.last_posted_on,
           re.name, re.note, a.currency as account_currency
    from public.recurring_expenses re
    join public.accounts a on a.id = re.account_id
    where re.is_active
      and re.auto_post
      and re.next_due_on <= current_date
  loop
    -- Each row gets its own exception block. An uncaught error inside a
    -- plpgsql loop aborts the entire call, which is how v1 once silently
    -- skipped every user's recurring posts because of one bad row.
    begin
      v_due := r.next_due_on;
      v_guard := 0;

      -- Catch up fully rather than one occurrence per daily run, so a
      -- subscription left dormant for months doesn't take months to
      -- reconcile. The guard bounds a pathological date.
      while v_due <= current_date and v_guard < 120 loop
        if r.last_posted_on is null or r.last_posted_on < v_due then
          insert into public.transactions
            (user_id, payer_id, account_id, occurred_on, direction,
             amount_minor, currency, category_id, note)
          values
            (r.user_id, r.payer_id, r.account_id, v_due, 'out',
             r.amount_minor, r.account_currency, r.category_id,
             coalesce(nullif(r.note, ''), r.name));

          v_posted := v_posted + 1;
        end if;

        update public.recurring_expenses
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
      raise warning 'recurring expense % skipped: %', r.id, sqlerrm;
    end;
  end loop;

  return v_posted;
end;
$$;

-- Only the scheduler needs this. A client calling it directly would post
-- other users' rows, since it is security definer.
revoke all on function public.post_due_recurring_expenses() from public, anon, authenticated;

select cron.schedule(
  'post-due-recurring-expenses',
  '10 5 * * *',
  'select public.post_due_recurring_expenses()'
);
