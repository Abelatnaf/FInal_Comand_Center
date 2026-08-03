-- The Ledger filters on tags and the tax flag alongside the week number, and
-- a view has no foreign key for PostgREST to embed through -- so the two
-- columns belong on the view rather than being fetched by a second round trip.
-- Dropped and recreated rather than replaced: CREATE OR REPLACE VIEW can only
-- append columns at the end, and these sit next to `note` where they belong.
drop view transactions_with_week;

create view transactions_with_week with (security_invoker = true) as
select
  t.id,
  t.user_id,
  t.account_id,
  t.occurred_on,
  t.direction,
  t.amount_minor,
  t.category_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  t.note,
  t.tags,
  t.is_tax_deductible,
  t.obligation_id,
  t.receipt_path,
  t.created_at,
  case
    when s.tracking_start_date is not null
      then floor((t.occurred_on - s.tracking_start_date) / 7.0)::int + 1
  end as week_number
from transactions t
left join settings s on s.user_id = t.user_id
left join categories c on c.id = t.category_id;
