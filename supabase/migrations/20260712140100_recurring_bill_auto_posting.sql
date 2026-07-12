-- Recurring bill auto-posting: a daily pg_cron job that turns each active
-- recurring bill into a real transaction once its billing_day hits, instead
-- of relying on the user to remember to log it by hand.

create extension if not exists pg_cron;

alter table public.recurring_bills add column last_posted_date date;

create or replace function public.post_due_recurring_bills()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  bill record;
  v_already_logged boolean;
begin
  for bill in
    select * from public.recurring_bills
    where active
      and billing_day = extract(day from current_date)::int
      and (last_posted_date is null or last_posted_date < date_trunc('month', current_date)::date)
  loop
    select exists (
      select 1 from public.transactions
      where user_id = bill.user_id
        and date = current_date
        and amount_original = bill.monthly_cost_usd
        and category_id is not distinct from bill.category_id
    ) into v_already_logged;

    if not v_already_logged then
      insert into public.transactions
        (user_id, date, category_id, description, necessity, is_recurring, currency, amount_original, payment_method, notes)
      values
        (bill.user_id, current_date, bill.category_id, bill.name, 'Necessary', true, 'USD', bill.monthly_cost_usd, bill.payment_method, 'Auto-posted recurring bill');
    end if;

    update public.recurring_bills set last_posted_date = current_date where id = bill.id;
  end loop;
end;
$$;

revoke execute on function public.post_due_recurring_bills() from public, anon, authenticated;

select cron.schedule('post-recurring-bills-daily', '0 6 * * *', $$select public.post_due_recurring_bills();$$);
