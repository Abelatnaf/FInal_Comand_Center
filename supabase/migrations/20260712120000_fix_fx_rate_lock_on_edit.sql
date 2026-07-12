-- Bug: editing a transaction's date/currency/amount re-fires the trigger,
-- which re-looked-up settings.fx_rate and silently re-priced the row at
-- TODAY's rate instead of keeping the rate that was true when it was first
-- logged. Fix: store the rate actually used at insert time and never
-- overwrite it on update.

alter table public.transactions add column fx_rate_used numeric;
alter table public.income add column fx_rate_used numeric;

create or replace function public.set_computed_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tracking_start_date date;
  v_fx_rate numeric;
begin
  select tracking_start_date into v_tracking_start_date
  from public.settings where user_id = new.user_id;

  new.week_number := floor((new.date - v_tracking_start_date) / 7.0)::int + 1;

  if tg_op = 'INSERT' then
    select fx_rate into v_fx_rate from public.settings where user_id = new.user_id;
    new.fx_rate_used := v_fx_rate;
  else
    -- Preserve the rate locked in at insert time. Editing the amount or
    -- currency later must not re-price the transaction at today's rate.
    new.fx_rate_used := old.fx_rate_used;
  end if;

  if new.currency = 'USD' then
    new.amount_usd := new.amount_original;
  else
    new.amount_usd := round(new.amount_original / new.fx_rate_used, 2);
  end if;

  return new;
end;
$$;
