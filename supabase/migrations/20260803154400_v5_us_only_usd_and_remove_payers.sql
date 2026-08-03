-- v5: a US, USD-only expense tracker for the general public.
--
-- Two directional changes, both confirmed before applying:
--   1. USD only. The whole ETB / exchange-rate system comes out: the fx_rates
--      table, the per-transaction frozen rate, the currency column on every
--      money-holding table. Nothing was ever logged in ETB (verified: 2 rows,
--      both USD, both rate 1.0), so no historical amount changes value here.
--   2. No payers. "Who is paying this, me or my family" was a VMI-specific
--      concept that forced a required field onto every entry. It is gone.
--
-- With the exchange rate gone, `amount_usd_minor` on transactions is exactly
-- `amount_minor`, so the duplicate column is dropped rather than kept in sync.
-- Views keep their `_usd_minor` output names -- still accurate, every figure
-- is dollars -- so downstream consumers do not have to be renamed.

-- Views depend on the columns being dropped, so they come down first and are
-- rebuilt at the end of this migration.
drop view if exists installment_progress;
drop view if exists obligation_progress;
drop view if exists savings_goal_progress;
drop view if exists liquid_position;
drop view if exists balance_by_account;
drop view if exists transactions_with_week;
drop view if exists budget_status;
drop view if exists category_spend_by_month;
drop view if exists monthly_summary;

-- The two Ethiopian accounts hold no balance and have no transactions. A
-- "Cash ETB" account in a dollars-only app would be actively misleading.
delete from accounts where currency = 'ETB';

alter table transactions
  drop column currency,
  drop column fx_rate_etb_per_usd,
  drop column amount_usd_minor,
  drop column payer_id;

alter table obligations drop column payer_id;
alter table recurring_expenses drop column payer_id;

drop table payers;
drop table fx_rates;

-- Accounts: no currency, and the kinds now describe real US account types.
-- A credit card is a first-class liability rather than a "processor", which
-- is what makes net worth (assets minus debt) computable at all.
alter table accounts drop column currency;
alter table accounts drop constraint accounts_kind_check;
update accounts
  set kind = case kind when 'bank' then 'checking' when 'processor' then 'other' else kind end;
alter table accounts add constraint accounts_kind_check
  check (kind in ('checking', 'savings', 'cash', 'credit', 'investment', 'other'));
alter table accounts add column institution text;
alter table accounts add column credit_limit_minor bigint
  check (credit_limit_minor is null or credit_limit_minor >= 0);

alter table savings_goals drop column currency;

-- One currency means a transfer moves exactly one amount. Two independent
-- sides only existed to represent a cross-currency spread.
alter table transfers rename column from_amount_minor to amount_minor;
alter table transfers drop column to_amount_minor;

-- ---------------------------------------------------------------------------
-- Cross-row ownership checks.
--
-- These are new, and they matter specifically because signup is now open. RLS
-- checks a row's own user_id; it does NOT check that the account, category or
-- bill the row points at belongs to the same person. Without these, anyone who
-- learned another user's account uuid could write a transaction into their
-- balance -- a real cross-tenant write. The FKs alone don't help: they only
-- require the target to exist, not to be yours.
-- ---------------------------------------------------------------------------

drop function if exists set_transaction_computed_fields() cascade;

create function assert_owned(p_table text, p_id uuid, p_user_id uuid, p_label text)
returns void language plpgsql set search_path to '' as $$
declare
  v_owner uuid;
begin
  if p_id is null then return; end if;
  execute format('select user_id from public.%I where id = $1', p_table)
    into v_owner using p_id;
  if v_owner is null or v_owner <> p_user_id then
    raise exception '% not found', p_label;
  end if;
end;
$$;

create function validate_transaction_refs()
returns trigger language plpgsql set search_path to '' as $$
begin
  if new.account_id is null then
    raise exception 'Pick an account';
  end if;
  perform public.assert_owned('accounts', new.account_id, new.user_id, 'Account');
  perform public.assert_owned('categories', new.category_id, new.user_id, 'Category');
  perform public.assert_owned('obligations', new.obligation_id, new.user_id, 'Bill');
  return new;
end;
$$;

create trigger transactions_validate_refs
  before insert or update on transactions
  for each row execute function validate_transaction_refs();

create function validate_transfer_refs()
returns trigger language plpgsql set search_path to '' as $$
begin
  if new.from_account_id = new.to_account_id then
    raise exception 'A transfer needs two different accounts';
  end if;
  perform public.assert_owned('accounts', new.from_account_id, new.user_id, 'Account');
  perform public.assert_owned('accounts', new.to_account_id, new.user_id, 'Account');
  return new;
end;
$$;

create trigger transfers_validate_refs
  before insert or update on transfers
  for each row execute function validate_transfer_refs();

create function validate_recurring_expense_refs()
returns trigger language plpgsql set search_path to '' as $$
begin
  perform public.assert_owned('accounts', new.account_id, new.user_id, 'Account');
  perform public.assert_owned('categories', new.category_id, new.user_id, 'Category');
  return new;
end;
$$;

create trigger recurring_expenses_validate_refs
  before insert or update on recurring_expenses
  for each row execute function validate_recurring_expense_refs();

create function validate_savings_goal_refs()
returns trigger language plpgsql set search_path to '' as $$
begin
  perform public.assert_owned('accounts', new.account_id, new.user_id, 'Account');
  return new;
end;
$$;

create trigger savings_goals_validate_refs
  before insert or update on savings_goals
  for each row execute function validate_savings_goal_refs();

create function validate_installment_refs()
returns trigger language plpgsql set search_path to '' as $$
begin
  perform public.assert_owned('obligations', new.obligation_id, new.user_id, 'Bill');
  return new;
end;
$$;

create trigger obligation_installments_validate_refs
  before insert or update on obligation_installments
  for each row execute function validate_installment_refs();

revoke execute on function assert_owned(text, uuid, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Views, rebuilt.
-- ---------------------------------------------------------------------------

create view balance_by_account with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.name,
  a.kind,
  a.institution,
  a.credit_limit_minor,
  a.is_archived,
  a.kind = 'credit' as is_liability,
  (
    a.opening_balance_minor
    + coalesce((
        select sum(case when t.direction = 'in' then t.amount_minor else -t.amount_minor end)
        from transactions t where t.account_id = a.id), 0)
    - coalesce((select sum(tr.amount_minor) from transfers tr where tr.from_account_id = a.id), 0)
    + coalesce((select sum(tr.amount_minor) from transfers tr where tr.to_account_id = a.id), 0)
  )::bigint as balance_minor
from accounts a;

-- A credit-card balance goes negative as you spend on it, so net worth is a
-- plain sum: cash and investments net of what you owe.
create view liquid_position with (security_invoker = true) as
select
  user_id,
  coalesce(sum(balance_minor) filter (where not is_liability), 0)::bigint as total_liquid_usd_minor,
  coalesce(-sum(balance_minor) filter (where is_liability), 0)::bigint as total_debt_usd_minor,
  coalesce(sum(balance_minor), 0)::bigint as net_worth_usd_minor
from balance_by_account
where is_archived = false
group by user_id;

create view budget_status with (security_invoker = true) as
select
  c.id as category_id,
  c.user_id,
  c.name,
  c.color,
  c.icon,
  c.sort_order,
  c.monthly_budget_usd_minor,
  coalesce(sum(t.amount_minor), 0)::bigint as spent_usd_minor,
  case
    when c.monthly_budget_usd_minor is null or c.monthly_budget_usd_minor = 0 then null::bigint
    else (c.monthly_budget_usd_minor - coalesce(sum(t.amount_minor), 0))::bigint
  end as remaining_usd_minor,
  case
    when c.monthly_budget_usd_minor is null or c.monthly_budget_usd_minor = 0 then null::numeric
    else round(coalesce(sum(t.amount_minor), 0) * 100.0 / c.monthly_budget_usd_minor, 1)
  end as percent_used
from categories c
left join transactions t
  on t.category_id = c.id
  and t.direction = 'out'
  and t.occurred_on >= date_trunc('month', current_date)::date
  and t.occurred_on < (date_trunc('month', current_date) + interval '1 month')::date
where c.kind = 'expense' and c.is_archived = false
group by c.id, c.user_id, c.name, c.color, c.icon, c.sort_order, c.monthly_budget_usd_minor;

create view category_spend_by_month with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.occurred_on)::date as month,
  c.id as category_id,
  c.name as category_name,
  c.color as category_color,
  c.icon as category_icon,
  sum(t.amount_minor)::bigint as spent_usd_minor,
  count(*) as entry_count
from transactions t
join categories c on c.id = t.category_id
where t.direction = 'out'
group by t.user_id, date_trunc('month', t.occurred_on), c.id, c.name, c.color, c.icon;

create view monthly_summary with (security_invoker = true) as
select
  user_id,
  date_trunc('month', occurred_on)::date as month,
  sum(case when direction = 'in' then amount_minor else 0 end)::bigint as income_usd_minor,
  sum(case when direction = 'out' then amount_minor else 0 end)::bigint as spent_usd_minor,
  sum(case when direction = 'in' then amount_minor else -amount_minor end)::bigint as net_usd_minor,
  count(*) as entry_count
from transactions
group by user_id, date_trunc('month', occurred_on);

create view obligation_progress with (security_invoker = true) as
select
  o.id as obligation_id,
  o.user_id,
  o.title,
  o.due_on,
  o.amount_usd_minor,
  o.source_note,
  o.waived_at,
  coalesce(paid.amount_paid_usd_minor, 0) as amount_paid_usd_minor,
  greatest(o.amount_usd_minor - coalesce(paid.amount_paid_usd_minor, 0), 0) as amount_remaining_usd_minor,
  case
    when o.waived_at is not null then 'waived'
    when coalesce(paid.amount_paid_usd_minor, 0) >= o.amount_usd_minor then 'paid'
    when coalesce(paid.amount_paid_usd_minor, 0) > 0 then 'partial'
    else 'open'
  end as status,
  o.waived_at is null
    and o.due_on is not null
    and o.due_on < current_date
    and coalesce(paid.amount_paid_usd_minor, 0) < o.amount_usd_minor as is_past_due,
  o.due_on - current_date as days_until_due
from obligations o
left join (
  select obligation_id, sum(amount_minor) as amount_paid_usd_minor
  from transactions
  where obligation_id is not null and direction = 'out'
  group by obligation_id
) paid on paid.obligation_id = o.id;

create view installment_progress with (security_invoker = true) as
with cumulative as (
  select
    i.id, i.user_id, i.obligation_id, i.seq, i.due_on, i.amount_usd_minor,
    coalesce(sum(i.amount_usd_minor) over (
      partition by i.obligation_id order by i.seq
      rows between unbounded preceding and 1 preceding), 0) as cumulative_before_minor
  from obligation_installments i
)
select
  c.id as installment_id,
  c.user_id,
  c.obligation_id,
  c.seq,
  c.due_on,
  c.amount_usd_minor,
  c.cumulative_before_minor::bigint as cumulative_before_minor,
  greatest(least(c.amount_usd_minor, coalesce(op.amount_paid_usd_minor, 0) - c.cumulative_before_minor), 0)::bigint as amount_covered_minor,
  coalesce(op.amount_paid_usd_minor, 0) >= (c.cumulative_before_minor + c.amount_usd_minor) as is_settled,
  c.due_on is not null
    and c.due_on < current_date
    and coalesce(op.amount_paid_usd_minor, 0) < (c.cumulative_before_minor + c.amount_usd_minor) as is_past_due
from cumulative c
join obligation_progress op on op.obligation_id = c.obligation_id;

create view savings_goal_progress with (security_invoker = true) as
select
  g.id,
  g.user_id,
  g.name,
  g.target_minor,
  g.target_date,
  g.account_id,
  g.note,
  g.created_at,
  a.name as account_name,
  coalesce(case when g.account_id is not null then greatest(b.balance_minor, 0) end, g.saved_manual_minor) as saved_minor,
  greatest(g.target_minor - coalesce(case when g.account_id is not null then greatest(b.balance_minor, 0) end, g.saved_manual_minor), 0) as remaining_minor,
  case when g.target_date is not null then g.target_date - current_date end as days_until_target
from savings_goals g
left join accounts a on a.id = g.account_id
left join balance_by_account b on b.account_id = g.account_id;

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

-- ---------------------------------------------------------------------------
-- Functions that referenced dropped columns.
-- ---------------------------------------------------------------------------

create or replace function post_due_recurring_expenses()
returns integer language plpgsql security definer set search_path to '' as $$
declare
  r record;
  v_posted integer := 0;
  v_due date;
  v_guard integer;
begin
  for r in
    select re.id, re.user_id, re.account_id, re.category_id, re.amount_minor,
           re.cadence, re.next_due_on, re.last_posted_on, re.name, re.note
    from public.recurring_expenses re
    where re.is_active and re.auto_post and re.next_due_on <= current_date
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
            (user_id, account_id, occurred_on, direction, amount_minor, category_id, note)
          values
            (r.user_id, r.account_id, v_due, 'out', r.amount_minor, r.category_id,
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

create or replace function spawn_due_recurring_obligations()
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_count int := 0;
  r record;
begin
  for r in
    select o.* from public.obligations o
    where o.recur_interval_months is not null
      and o.recur_spawned_at is null
      and o.due_on is not null
      and o.due_on <= current_date
      and o.waived_at is null
  loop
    -- Per-row exception handling on purpose: this loop spans every user, and
    -- an uncaught error inside a plpgsql loop aborts the whole call.
    begin
      insert into public.obligations
        (user_id, title, due_on, amount_usd_minor, source_note, recur_interval_months)
      values
        (r.user_id, r.title,
         (r.due_on + make_interval(months => r.recur_interval_months))::date,
         r.amount_usd_minor, r.source_note, r.recur_interval_months);

      update public.obligations set recur_spawned_at = now() where id = r.id;
      v_count := v_count + 1;
    exception when others then
      null;
    end;
  end loop;
  return v_count;
end;
$$;

-- Return signature changes (no payer label, no FX date), so this is a drop
-- and recreate rather than a replace.
drop function if exists get_shared_snapshot(text);

create function get_shared_snapshot(p_token text)
returns table (
  found boolean,
  total_liquid_usd_minor bigint,
  net_worth_usd_minor bigint,
  next_due_title text,
  next_due_remaining_usd_minor bigint,
  next_due_days_until_due integer,
  next_due_is_past_due boolean,
  balances jsonb
)
language plpgsql security definer set search_path to '' as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
    from public.share_links
    where id = p_token and revoked_at is null;

  if v_user_id is null then
    return query select false, null::bigint, null::bigint, null::text,
                        null::bigint, null::int, null::boolean, null::jsonb;
    return;
  end if;

  return query
  select
    true,
    lp.total_liquid_usd_minor::bigint,
    lp.net_worth_usd_minor::bigint,
    nd.title,
    nd.amount_remaining_usd_minor::bigint,
    nd.days_until_due,
    nd.is_past_due,
    coalesce((
      select jsonb_agg(jsonb_build_object('name', b.name, 'balance_minor', b.balance_minor)
                       order by b.kind, b.name)
      from public.balance_by_account b
      where b.user_id = v_user_id and b.is_archived = false
    ), '[]'::jsonb)
  from (select v_user_id as user_id) u
  left join public.liquid_position lp on lp.user_id = u.user_id
  left join lateral (
    select * from public.obligation_progress op
    where op.user_id = u.user_id and op.status in ('open', 'partial')
    order by (op.due_on is null), op.due_on asc
    limit 1
  ) nd on true;
end;
$$;

grant execute on function get_shared_snapshot(text) to anon, authenticated;
