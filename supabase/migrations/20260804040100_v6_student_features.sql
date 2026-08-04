-- Splitting with roommates.
--
-- A share is an IOU, not a reduction of the expense. You paid the full amount
-- and it really left your account, so the transaction stays whole -- otherwise
-- balances and category totals would disagree with reality. Settling up
-- creates a real income entry, which is exactly what happens when they pay you.
create table split_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_id uuid not null references transactions(id) on delete cascade,
  person text not null check (length(btrim(person)) > 0),
  amount_minor bigint not null check (amount_minor > 0),
  settled_at timestamptz,
  settled_transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index split_shares_user_idx on split_shares (user_id);
create index split_shares_transaction_idx on split_shares (transaction_id);
create index split_shares_settled_transaction_idx on split_shares (settled_transaction_id);
alter table split_shares enable row level security;
create policy split_shares_own on split_shares
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create view owed_to_me with (security_invoker = true) as
select s.user_id, s.person, count(*) as share_count,
       sum(s.amount_minor)::bigint as owed_minor, min(t.occurred_on) as oldest_on
from split_shares s
join transactions t on t.id = s.transaction_id
where s.settled_at is null
group by s.user_id, s.person;

-- Meal plan. Dining dollars are just an account of kind 'meal_plan', so the
-- ledger and balances already handle them; only swipes need their own record,
-- because a swipe is a different unit and can't share a dollar balance.
create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  term_id uuid not null references terms(id) on delete cascade,
  name text not null default 'Meal plan',
  account_id uuid references accounts(id) on delete set null,
  swipes_total integer check (swipes_total is null or swipes_total >= 0),
  created_at timestamptz not null default now()
);
create index meal_plans_user_idx on meal_plans (user_id);
create index meal_plans_term_idx on meal_plans (term_id);
create index meal_plans_account_idx on meal_plans (account_id);
alter table meal_plans enable row level security;
create policy meal_plans_own on meal_plans
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table meal_swipe_uses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  used_on date not null default current_date,
  swipes integer not null default 1 check (swipes > 0),
  created_at timestamptz not null default now()
);
create index meal_swipe_uses_user_idx on meal_swipe_uses (user_id);
create index meal_swipe_uses_plan_idx on meal_swipe_uses (meal_plan_id);
alter table meal_swipe_uses enable row level security;
create policy meal_swipe_uses_own on meal_swipe_uses
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create view meal_plan_progress with (security_invoker = true) as
select
  m.id as meal_plan_id, m.user_id, m.term_id, m.name, m.account_id, m.swipes_total,
  coalesce((select sum(u.swipes) from meal_swipe_uses u where u.meal_plan_id = m.id), 0)::int as swipes_used,
  case when m.swipes_total is not null
    then greatest(m.swipes_total - coalesce((select sum(u.swipes) from meal_swipe_uses u where u.meal_plan_id = m.id), 0), 0)::int
  end as swipes_remaining,
  coalesce(b.balance_minor, 0)::bigint as dining_minor,
  t.starts_on, t.ends_on,
  greatest(t.ends_on - current_date, 0) as days_remaining,
  -- Weeks are the unit people think in for swipes ("14 a week"), so surface
  -- both. Ceil so a part-week still counts as a week to spread across.
  ceil(greatest(t.ends_on - current_date, 0) / 7.0)::int as weeks_remaining
from meal_plans m
join terms t on t.id = m.term_id
left join balance_by_account b on b.account_id = m.account_id;

-- Student loans. Deliberately a record of what's been borrowed and what it
-- will cost, not a payment tracker -- nothing is being repaid yet.
create table student_loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  servicer text,
  term_id uuid references terms(id) on delete set null,
  principal_minor bigint not null check (principal_minor > 0),
  -- Basis points, so 5.43% is 543 and no float ever touches a rate.
  interest_rate_bp integer not null default 0 check (interest_rate_bp >= 0),
  is_subsidized boolean not null default false,
  disbursed_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index student_loans_user_idx on student_loans (user_id);
create index student_loans_term_idx on student_loans (term_id);
alter table student_loans enable row level security;
create policy student_loans_own on student_loans
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create view student_loan_summary with (security_invoker = true) as
with per_loan as (
  select
    l.user_id, l.principal_minor, l.interest_rate_bp,
    -- Subsidised loans don't accrue while you're enrolled, so counting
    -- interest on them would overstate the debt.
    case when l.is_subsidized then 0
      else round(l.principal_minor * (l.interest_rate_bp / 10000.0)
                 * (current_date - l.disbursed_on) / 365.0)
    end::bigint as accrued_minor
  from student_loans l
),
totals as (
  select
    user_id, count(*) as loan_count,
    sum(principal_minor)::bigint as principal_minor,
    sum(accrued_minor)::bigint as accrued_interest_minor,
    case when sum(principal_minor) > 0
      then sum(principal_minor * interest_rate_bp)::numeric / sum(principal_minor) / 10000.0
    end as avg_rate
  from per_loan group by user_id
)
select
  user_id, loan_count, principal_minor, accrued_interest_minor,
  (principal_minor + accrued_interest_minor)::bigint as balance_minor,
  round(avg_rate * 100, 2) as avg_rate_percent,
  -- Standard 10-year repayment, so the number means something concrete.
  case when avg_rate > 0 then
    round((principal_minor + accrued_interest_minor) * (avg_rate / 12)
          / (1 - power(1 + avg_rate / 12, -120)))::bigint
  else round((principal_minor + accrued_interest_minor) / 120.0)::bigint end
    as est_monthly_payment_minor
from totals;

-- Ownership checks for the new tables. SECURITY DEFINER from the start: these
-- call assert_owned, which is revoked from clients, and an invoker-rights
-- trigger would fail with "permission denied" on every insert.
create function validate_split_share_refs()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  perform public.assert_owned('transactions', new.transaction_id, new.user_id, 'Entry');
  perform public.assert_owned('transactions', new.settled_transaction_id, new.user_id, 'Entry');
  return new;
end;
$$;
create trigger split_shares_validate_refs before insert or update on split_shares
  for each row execute function validate_split_share_refs();

create function validate_meal_plan_refs()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  perform public.assert_owned('terms', new.term_id, new.user_id, 'Term');
  perform public.assert_owned('accounts', new.account_id, new.user_id, 'Account');
  return new;
end;
$$;
create trigger meal_plans_validate_refs before insert or update on meal_plans
  for each row execute function validate_meal_plan_refs();

create function validate_meal_swipe_refs()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  perform public.assert_owned('meal_plans', new.meal_plan_id, new.user_id, 'Meal plan');
  return new;
end;
$$;
create trigger meal_swipe_uses_validate_refs before insert or update on meal_swipe_uses
  for each row execute function validate_meal_swipe_refs();

create function validate_student_loan_refs()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  perform public.assert_owned('terms', new.term_id, new.user_id, 'Term');
  return new;
end;
$$;
create trigger student_loans_validate_refs before insert or update on student_loans
  for each row execute function validate_student_loan_refs();

revoke execute on function validate_split_share_refs() from public, anon, authenticated;
revoke execute on function validate_meal_plan_refs() from public, anon, authenticated;
revoke execute on function validate_meal_swipe_refs() from public, anon, authenticated;
revoke execute on function validate_student_loan_refs() from public, anon, authenticated;
