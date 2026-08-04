-- Open signup: every new account provisions itself, plus the schema for the
-- new feature batch (tags, tax flags, auto-categorisation rules, net worth).

alter table settings add column onboarding_completed boolean not null default false;
alter table settings add column display_name text;

-- The existing user has been using the app; don't show them a first run.
update settings set onboarding_completed = true;

alter table transactions add column tags text[] not null default '{}';
alter table transactions add column is_tax_deductible boolean not null default false;
create index transactions_tags_idx on transactions using gin (tags);
create index transactions_note_idx on transactions (user_id, note);

-- Auto-categorisation. A rule is "if the description contains X, file it
-- under Y" -- the single highest-leverage thing for anyone importing a bank
-- CSV, where every row arrives uncategorised.
create table category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_text text not null check (length(btrim(match_text)) > 0),
  category_id uuid not null references categories(id) on delete cascade,
  priority integer not null default 100,
  created_at timestamptz not null default now()
);
create index category_rules_user_idx on category_rules (user_id);
create index category_rules_category_idx on category_rules (category_id);
alter table category_rules enable row level security;
create policy category_rules_own on category_rules
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Rules are applied in the trigger rather than in the app so that every write
-- path gets them for free: manual add, CSV import, the recurring-expense cron
-- job, and the offline queue replay. Doing it in one app action would have
-- silently skipped the other three.
create or replace function validate_transaction_refs()
returns trigger language plpgsql set search_path to '' as $$
declare
  v_category uuid;
begin
  if new.account_id is null then
    raise exception 'Pick an account';
  end if;
  perform public.assert_owned('accounts', new.account_id, new.user_id, 'Account');
  perform public.assert_owned('categories', new.category_id, new.user_id, 'Category');
  perform public.assert_owned('obligations', new.obligation_id, new.user_id, 'Bill');

  if new.category_id is null and coalesce(new.note, '') <> '' then
    select r.category_id into v_category
    from public.category_rules r
    join public.categories c on c.id = r.category_id
    where r.user_id = new.user_id
      and c.is_archived = false
      and c.kind = case when new.direction = 'out' then 'expense' else 'income' end
      and position(lower(r.match_text) in lower(new.note)) > 0
    order by r.priority asc, length(r.match_text) desc
    limit 1;

    new.category_id := v_category;
  end if;

  return new;
end;
$$;

-- Net worth over time. Transfers move money between your own accounts, so
-- they never change net worth -- only income and spending do, which is why
-- this only has to walk transactions.
create view net_worth_by_month with (security_invoker = true) as
with bounds as (
  select
    a.user_id,
    sum(a.opening_balance_minor) as opening_minor,
    least(
      coalesce((select min(t.occurred_on) from transactions t
                join accounts ta on ta.id = t.account_id and ta.is_archived = false
                where t.user_id = a.user_id), current_date),
      current_date
    ) as first_on
  from accounts a
  where a.is_archived = false
  group by a.user_id
),
months as (
  select
    b.user_id,
    b.opening_minor,
    generate_series(date_trunc('month', b.first_on),
                    date_trunc('month', current_date),
                    interval '1 month')::date as month
  from bounds b
)
select
  m.user_id,
  m.month,
  (m.opening_minor + coalesce((
    select sum(case when t.direction = 'in' then t.amount_minor else -t.amount_minor end)
    from transactions t
    join accounts a on a.id = t.account_id and a.is_archived = false
    where t.user_id = m.user_id
      and t.occurred_on < (m.month + interval '1 month')::date
  ), 0))::bigint as net_worth_usd_minor
from months m;

-- Provision a usable app for every new signup. Landing in an empty app with
-- no accounts and no categories would make the first entry impossible, since
-- a transaction requires an account.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  insert into public.settings (user_id, tracking_start_date)
  values (new.id, current_date);

  insert into public.accounts (user_id, name, kind, opening_balance_minor)
  values
    (new.id, 'Checking', 'checking', 0),
    (new.id, 'Savings',  'savings',  0),
    (new.id, 'Cash',     'cash',     0);

  insert into public.categories (user_id, name, kind, color, icon, sort_order)
  values
    (new.id, 'Groceries',         'expense', 'emerald', '🛒',  10),
    (new.id, 'Dining Out',        'expense', 'amber',   '🍔',  20),
    (new.id, 'Transport',         'expense', 'blue',    '🚗',  30),
    (new.id, 'Rent & Housing',    'expense', 'violet',  '🏠',  40),
    (new.id, 'Utilities',         'expense', 'cyan',    '💡',  50),
    (new.id, 'Shopping',          'expense', 'pink',    '🛍️',  60),
    (new.id, 'Health & Medical',  'expense', 'rose',    '💊',  70),
    (new.id, 'Entertainment',     'expense', 'orange',  '🎬',  80),
    (new.id, 'Subscriptions',     'expense', 'indigo',  '🔁',  90),
    (new.id, 'Insurance',         'expense', 'teal',    '🏥', 100),
    (new.id, 'Travel',            'expense', 'lime',    '✈️', 110),
    (new.id, 'Personal Care',     'expense', 'pink',    '🧴', 120),
    (new.id, 'Education',         'expense', 'teal',    '📚', 130),
    (new.id, 'Pets',              'expense', 'orange',  '🐾', 140),
    (new.id, 'Gifts & Donations', 'expense', 'rose',    '🎁', 150),
    (new.id, 'Debt Payment',      'expense', 'slate',   '🏦', 160),
    (new.id, 'Taxes',             'expense', 'slate',   '📈', 170),
    (new.id, 'Fees & Charges',    'expense', 'slate',   '🏦', 180),
    (new.id, 'Other',             'expense', 'slate',   '📦', 999),
    (new.id, 'Paycheck',          'income',  'emerald', '💼',  10),
    (new.id, 'Freelance',         'income',  'blue',    '💻',  20),
    (new.id, 'Bonus',             'income',  'amber',   '🎁',  30),
    (new.id, 'Refund',            'income',  'cyan',    '↩️',  40),
    (new.id, 'Investment',        'income',  'violet',  '📈',  50),
    (new.id, 'Gift',              'income',  'pink',    '🎁',  60),
    (new.id, 'Other',             'income',  'slate',   '📦', 999);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Postgres fires a trigger function internally regardless of grants; this
-- only closes it off as a directly-callable RPC.
revoke execute on function handle_new_user() from public, anon, authenticated;

-- A public app has to let people take their data and leave.
create or replace function delete_own_account()
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then
    raise exception 'Must be signed in';
  end if;

  -- FK-safe order: everything that references accounts or obligations with
  -- ON DELETE RESTRICT has to clear before they do.
  delete from public.transactions where user_id = v_user;
  delete from public.transfers where user_id = v_user;
  delete from public.recurring_expenses where user_id = v_user;
  delete from public.savings_goals where user_id = v_user;
  delete from public.obligation_installments where user_id = v_user;
  delete from public.obligations where user_id = v_user;
  delete from public.category_rules where user_id = v_user;
  delete from public.accounts where user_id = v_user;
  delete from public.categories where user_id = v_user;
  delete from public.share_links where user_id = v_user;
  delete from public.settings where user_id = v_user;
  delete from auth.users where id = v_user;
end;
$$;

revoke execute on function delete_own_account() from public, anon;
grant execute on function delete_own_account() to authenticated;
