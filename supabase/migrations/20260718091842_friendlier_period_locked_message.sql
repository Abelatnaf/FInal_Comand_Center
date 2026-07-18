-- Text-only update: match the "Monthly Checkup" page's new plain-language
-- terminology (locked/unlock instead of closed/reopen) in the error a user
-- sees when they try to edit a transaction/income/transfer dated inside a
-- locked month directly from another page.
create or replace function public.check_period_not_closed()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_check_dates date[];
  v_closed_month date;
begin
  if tg_op = 'DELETE' then
    v_user_id := old.user_id;
    v_check_dates := array[date_trunc('month', old.date)::date];
  elsif tg_op = 'UPDATE' then
    v_user_id := new.user_id;
    v_check_dates := array[date_trunc('month', old.date)::date, date_trunc('month', new.date)::date];
  else
    v_user_id := new.user_id;
    v_check_dates := array[date_trunc('month', new.date)::date];
  end if;

  select period_month into v_closed_month
  from public.period_closes
  where user_id = v_user_id
    and status = 'closed'
    and period_month = any(v_check_dates)
  limit 1;

  if v_closed_month is not null then
    raise exception 'The month % is locked. Unlock it on the Monthly Checkup page before editing.', to_char(v_closed_month, 'Mon YYYY');
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
