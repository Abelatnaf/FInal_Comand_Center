-- Settings: opt-in low-balance threshold for the new alerts banner (null = disabled).
alter table public.settings add column low_balance_threshold numeric;

-- Accounts: optional APR for the debt payoff planner (liabilities only in practice,
-- but not constrained to that — a no-op for asset accounts that don't set it).
alter table public.accounts add column interest_rate_pct numeric;

-- Savings goals: optional link to a real account. When set, saved_so_far is
-- derived live from that account's balance instead of the manual field.
alter table public.savings_goals add column account_id uuid references public.accounts(id) on delete set null;
create index savings_goals_account_id_idx on public.savings_goals(account_id);

-- ------------------------------------------------------------------
-- Live per-account balance, scoped to asset accounts. Liability figures
-- stay owned by the net-worth-snapshot/variance system (a transaction
-- tagged to a liability account is ambiguous — charge vs. payment — which
-- this schema doesn't disambiguate, so this view doesn't attempt it).
-- Exists specifically to back live savings-goal tracking.
-- ------------------------------------------------------------------
create view public.account_balances
with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
  a.starting_balance
    + coalesce((select sum(i.amount_usd) from public.income i where i.account_id = a.id), 0)
    - coalesce((select sum(t.amount_usd) from public.transactions t where t.account_id = a.id), 0)
    + coalesce((select sum(tr.amount_usd) from public.transfers tr where tr.to_account_id = a.id), 0)
    - coalesce((select sum(tr.amount_usd) from public.transfers tr where tr.from_account_id = a.id), 0)
  as balance
from public.accounts a
where a.kind = 'asset';

-- Rebuilt to add account_id + linked-account-derived saved_so_far (falls back
-- to the manual saved_so_far_usd field when no account is linked).
drop view public.savings_goal_progress;

create view public.savings_goal_progress
with (security_invoker = true) as
select
  g.id,
  g.name,
  g.target_amount_usd,
  g.target_date,
  g.account_id,
  coalesce(ab.balance, g.saved_so_far_usd) as saved_so_far_usd,
  g.target_amount_usd - coalesce(ab.balance, g.saved_so_far_usd) as remaining,
  case
    when g.target_amount_usd > 0
      then round(100.0 * coalesce(ab.balance, g.saved_so_far_usd) / g.target_amount_usd, 1)
    else 0
  end as percent_complete,
  case
    when g.target_date is null then null
    when g.target_date <= current_date
      then greatest(g.target_amount_usd - coalesce(ab.balance, g.saved_so_far_usd), 0)
    else round(
      (g.target_amount_usd - coalesce(ab.balance, g.saved_so_far_usd))
        / greatest(1, extract(day from age(g.target_date::timestamptz, current_date::timestamptz)) / 30.44),
      2
    )
  end as monthly_needed
from public.savings_goals g
left join public.account_balances ab on ab.account_id = g.account_id;

-- ------------------------------------------------------------------
-- Recurring income: mirrors recurring_bills, auto-posts to `income` on
-- billing_day the same way post_due_recurring_bills() does for transactions.
-- ------------------------------------------------------------------
create table public.recurring_income (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  source text not null,
  amount_usd numeric not null check (amount_usd > 0),
  account_id uuid references public.accounts(id) on delete set null,
  billing_day int check (billing_day between 1 and 31),
  active boolean not null default true,
  last_posted_date date,
  created_at timestamptz not null default now()
);

alter table public.recurring_income enable row level security;

create policy "recurring_income_all" on public.recurring_income
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index recurring_income_user_id_idx on public.recurring_income(user_id);
create index recurring_income_account_id_idx on public.recurring_income(account_id);

create trigger audit_recurring_income
  after insert or delete or update on public.recurring_income
  for each row execute function log_audit_change();

create function public.post_due_recurring_income()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  inc record;
  v_already_logged boolean;
begin
  for inc in
    select * from public.recurring_income
    where active
      and billing_day = extract(day from current_date)::int
      and (last_posted_date is null or last_posted_date < date_trunc('month', current_date)::date)
  loop
    select exists (
      select 1 from public.income
      where user_id = inc.user_id
        and date = current_date
        and amount_original = inc.amount_usd
        and source is not distinct from inc.source
    ) into v_already_logged;

    if not v_already_logged then
      insert into public.income
        (user_id, date, source, account_id, currency, amount_original, notes)
      values
        (inc.user_id, current_date, inc.source, inc.account_id, 'USD', inc.amount_usd, 'Auto-posted recurring income');
    end if;

    update public.recurring_income set last_posted_date = current_date where id = inc.id;
  end loop;
end;
$function$;

revoke execute on function public.post_due_recurring_income() from public, anon, authenticated;

select cron.schedule('post-recurring-income-daily', '0 6 * * *', $$select public.post_due_recurring_income();$$);
