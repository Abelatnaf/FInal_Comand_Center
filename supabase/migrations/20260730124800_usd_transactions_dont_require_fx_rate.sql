-- A pure-USD transaction never uses the ETB/USD rate: amount_usd_minor is
-- just amount_minor. Requiring a stored rate before any transaction could be
-- logged made the app unusable on a fresh account (nothing can be entered at
-- all until Settings has a rate), even for USD-only entries that ignore it.
--
-- USD rows still need *some* value in the not-null fx_rate_etb_per_usd column,
-- so they take the latest rate when one exists (keeping the historical record
-- accurate) and fall back to 1 purely as a placeholder when none does. That
-- placeholder is never read for a USD row -- amount_usd_minor is computed
-- directly from amount_minor -- so it cannot misprice anything.
--
-- ETB rows are unchanged: they genuinely cannot be converted without a real
-- rate, so they still raise. The rate-freezing rule on UPDATE is untouched.
create or replace function public.set_transaction_computed_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_account_currency char(3);
  v_rate numeric(12,4);
begin
  select currency into v_account_currency
    from public.accounts where id = new.account_id;

  if v_account_currency is null then
    raise exception 'Account not found';
  end if;

  if new.currency <> v_account_currency then
    raise exception 'Transaction currency (%) must match account currency (%)',
      new.currency, v_account_currency;
  end if;

  if tg_op = 'UPDATE' and old.currency = new.currency then
    new.fx_rate_etb_per_usd := old.fx_rate_etb_per_usd;
  else
    select etb_per_usd into v_rate
      from public.fx_rates
      where user_id = new.user_id
      order by effective_on desc, created_at desc
      limit 1;

    if v_rate is null then
      if new.currency = 'ETB' then
        raise exception 'Set an FX rate in Settings before logging an ETB transaction';
      end if;
      -- USD-only placeholder; never used to convert anything.
      v_rate := 1;
    end if;

    new.fx_rate_etb_per_usd := v_rate;
  end if;

  if new.currency = 'USD' then
    new.amount_usd_minor := new.amount_minor;
  else
    new.amount_usd_minor := round(new.amount_minor / new.fx_rate_etb_per_usd);
  end if;

  return new;
end;
$$;
