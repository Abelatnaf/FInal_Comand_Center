-- Optional second currency (e.g. ETB) shown alongside the main currency on
-- Home, converted live via a free keyless exchange-rate API (lib/fx.ts) —
-- not stored here, just the user's chosen target code.
alter table public.settings
  add column secondary_currency_code text;
