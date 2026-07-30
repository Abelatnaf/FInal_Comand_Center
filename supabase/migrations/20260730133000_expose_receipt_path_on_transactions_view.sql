-- The Ledger reads transactions_with_week, not the base table, so receipt_path
-- has to be exposed here too or attachments would be invisible everywhere the
-- Ledger renders. Dropped and recreated rather than `create or replace`
-- because the new column is not being appended at the end of the column list.
drop view public.transactions_with_week;

create view public.transactions_with_week
with (security_invoker = true) as
select
  t.id,
  t.user_id,
  t.payer_id,
  t.account_id,
  t.occurred_on,
  t.direction,
  t.amount_minor,
  t.currency,
  t.fx_rate_etb_per_usd,
  t.amount_usd_minor,
  t.category,
  t.note,
  t.obligation_id,
  t.receipt_path,
  t.created_at,
  case
    when s.tracking_start_date is not null
      then floor((t.occurred_on - s.tracking_start_date)::numeric / 7.0)::integer + 1
    else null::integer
  end as week_number
from public.transactions t
  left join public.settings s on s.user_id = t.user_id;

grant select on public.transactions_with_week to anon, authenticated, service_role;
