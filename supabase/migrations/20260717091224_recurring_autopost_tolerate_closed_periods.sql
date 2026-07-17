-- Both post_due_recurring_bills() and post_due_recurring_income() loop over
-- EVERY user's due rows in one security-definer call from a single pg_cron
-- job, with no per-row exception handling. The new period-lock trigger
-- (check_period_not_closed(), from the month-end-close migration just
-- before this one) raises on any insert into a closed month. Without a
-- guard, one user closing the current month would make their auto-post
-- insert raise, which — since plpgsql loops don't stop-and-continue on an
-- uncaught exception — aborts the whole function call and silently skips
-- every OTHER user's auto-posting for that day too. Wrapping each insert
-- in its own sub-block catches that one failure and moves on; last_posted_date
-- deliberately isn't touched on failure, so a bill/paycheck due during a
-- closed period just doesn't auto-post that month (no silent double-post
-- later, no retry storm — billing_day only matches once a month) rather
-- than pretending it posted.

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
    begin
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
    exception when others then
      -- Most commonly: this user's current-month period is closed. Skip
      -- just this bill and keep processing everyone else's.
      raise warning 'post_due_recurring_bills: skipped bill % for user % (%)', bill.id, bill.user_id, sqlerrm;
    end;
  end loop;
end;
$$;

create or replace function public.post_due_recurring_income()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inc record;
  v_already_logged boolean;
begin
  for inc in
    select * from public.recurring_income
    where active
      and billing_day = extract(day from current_date)::int
      and (last_posted_date is null or last_posted_date < date_trunc('month', current_date)::date)
  loop
    begin
      select exists (
        select 1 from public.income
        where user_id = inc.user_id
          and date = current_date
          and amount_original = inc.amount_usd
          and source is not distinct from inc.source
      ) into v_already_logged;

      if not v_already_logged then
        insert into public.income
          (user_id, date, source, account_id, currency, amount_original, notes)
        values
          (inc.user_id, current_date, inc.source, inc.account_id, 'USD', inc.amount_usd, 'Auto-posted recurring income');
      end if;

      update public.recurring_income set last_posted_date = current_date where id = inc.id;
    exception when others then
      raise warning 'post_due_recurring_income: skipped row % for user % (%)', inc.id, inc.user_id, sqlerrm;
    end;
  end loop;
end;
$$;
