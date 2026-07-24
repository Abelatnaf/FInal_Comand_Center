alter table public.entries
  add column entry_currency text,
  add column entry_original_amount numeric,
  add column entry_fx_rate numeric,
  add constraint entries_entry_currency_consistency check (
    (entry_currency is null and entry_original_amount is null and entry_fx_rate is null)
    or (entry_currency is not null and entry_original_amount is not null and entry_fx_rate is not null and entry_fx_rate > 0)
  );
