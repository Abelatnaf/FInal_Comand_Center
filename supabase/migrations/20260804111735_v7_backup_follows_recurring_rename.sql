-- v7: backup/restore follows the rename, or every backup taken from here is
-- silently lossy -- the same gap this project closed for transfers in v5 and for
-- the student tables in v6.
--
-- Two changes only, both additive to the existing function:
--   * read `recurring_entries`, falling back to the pre-v7 `recurring_expenses`
--     key so older backups still restore
--   * carry `terms.target_end_balance_minor`

create or replace function restore_from_backup(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_counts jsonb;
begin
  if v_user is null then raise exception 'Must be signed in to restore'; end if;
  if p_backup is null or jsonb_typeof(p_backup) <> 'object' then
    raise exception 'Backup is not a JSON object';
  end if;
  if not (p_backup ? 'transactions') or not (p_backup ? 'accounts') then
    raise exception 'This does not look like a Command Deck backup';
  end if;

  delete from public.split_shares where user_id = v_user;
  delete from public.meal_swipe_uses where user_id = v_user;
  delete from public.meal_plans where user_id = v_user;
  delete from public.student_loans where user_id = v_user;
  delete from public.transactions where user_id = v_user;
  delete from public.transfers where user_id = v_user;
  delete from public.recurring_entries where user_id = v_user;
  delete from public.savings_goals where user_id = v_user;
  delete from public.obligation_installments where user_id = v_user;
  delete from public.obligations where user_id = v_user;
  delete from public.category_rules where user_id = v_user;
  delete from public.accounts where user_id = v_user;
  delete from public.categories where user_id = v_user;
  delete from public.terms where user_id = v_user;
  delete from public.settings where user_id = v_user;

  insert into public.settings (user_id, tracking_start_date, display_name, onboarding_completed)
  select v_user, nullif(r->>'tracking_start_date', '')::date, r->>'display_name',
         coalesce((r->>'onboarding_completed')::boolean, true)
  from jsonb_array_elements(coalesce(p_backup->'settings', '[]'::jsonb)) r;

  insert into public.settings (user_id, tracking_start_date, onboarding_completed)
  select v_user, current_date, true
  where not exists (select 1 from public.settings where user_id = v_user);

  insert into public.terms (id, user_id, name, starts_on, ends_on, is_archived, target_end_balance_minor)
  select (r->>'id')::uuid, v_user, r->>'name', (r->>'starts_on')::date, (r->>'ends_on')::date,
         coalesce((r->>'is_archived')::boolean, false),
         coalesce((r->>'target_end_balance_minor')::bigint, 0)
  from jsonb_array_elements(coalesce(p_backup->'terms', '[]'::jsonb)) r;

  insert into public.categories
    (id, user_id, name, kind, color, icon, budget_usd_minor, sort_order, is_archived)
  select (r->>'id')::uuid, v_user, r->>'name', r->>'kind',
         coalesce(r->>'color', 'slate'), coalesce(r->>'icon', '•'),
         coalesce(nullif(r->>'budget_usd_minor', '')::bigint,
                  nullif(r->>'monthly_budget_usd_minor', '')::bigint),
         coalesce((r->>'sort_order')::int, 0),
         coalesce((r->>'is_archived')::boolean, false)
  from jsonb_array_elements(coalesce(p_backup->'categories', '[]'::jsonb)) r;

  insert into public.accounts
    (id, user_id, name, kind, institution, opening_balance_minor, is_archived)
  select (r->>'id')::uuid, v_user, r->>'name',
         coalesce(nullif(r->>'kind', ''), 'checking'), r->>'institution',
         coalesce((r->>'opening_balance_minor')::bigint, 0),
         coalesce((r->>'is_archived')::boolean, false)
  from jsonb_array_elements(coalesce(p_backup->'accounts', '[]'::jsonb)) r;

  insert into public.category_rules (id, user_id, match_text, category_id, priority)
  select (r->>'id')::uuid, v_user, r->>'match_text', (r->>'category_id')::uuid,
         coalesce((r->>'priority')::int, 100)
  from jsonb_array_elements(coalesce(p_backup->'category_rules', '[]'::jsonb)) r;

  insert into public.obligations
    (id, user_id, title, due_on, amount_usd_minor, source_note, waived_at,
     recur_interval_months, recur_spawned_at, statement_path)
  select (r->>'id')::uuid, v_user, r->>'title', nullif(r->>'due_on', '')::date,
         coalesce((r->>'amount_usd_minor')::bigint, 0), r->>'source_note',
         nullif(r->>'waived_at', '')::timestamptz,
         nullif(r->>'recur_interval_months', '')::int,
         nullif(r->>'recur_spawned_at', '')::timestamptz, r->>'statement_path'
  from jsonb_array_elements(coalesce(p_backup->'obligations', '[]'::jsonb)) r;

  insert into public.obligation_installments (id, user_id, obligation_id, seq, due_on, amount_usd_minor)
  select (r->>'id')::uuid, v_user, (r->>'obligation_id')::uuid, (r->>'seq')::int,
         nullif(r->>'due_on', '')::date, (r->>'amount_usd_minor')::bigint
  from jsonb_array_elements(coalesce(p_backup->'obligation_installments', '[]'::jsonb)) r;

  insert into public.transfers (id, user_id, occurred_on, from_account_id, to_account_id, amount_minor, note)
  select (r->>'id')::uuid, v_user, (r->>'occurred_on')::date,
         (r->>'from_account_id')::uuid, (r->>'to_account_id')::uuid,
         coalesce((r->>'amount_minor')::bigint, (r->>'from_amount_minor')::bigint), r->>'note'
  from jsonb_array_elements(coalesce(p_backup->'transfers', '[]'::jsonb)) r;

  insert into public.transactions
    (id, user_id, account_id, occurred_on, direction, amount_minor, category_id,
     note, obligation_id, receipt_path, tags)
  select (r->>'id')::uuid, v_user, (r->>'account_id')::uuid,
         (r->>'occurred_on')::date, r->>'direction', (r->>'amount_minor')::bigint,
         nullif(r->>'category_id', '')::uuid, r->>'note',
         nullif(r->>'obligation_id', '')::uuid, r->>'receipt_path',
         coalesce((select array_agg(value::text) from jsonb_array_elements_text(
                     case when jsonb_typeof(r->'tags') = 'array' then r->'tags' else '[]'::jsonb end
                   ) value), '{}')
  from jsonb_array_elements(coalesce(p_backup->'transactions', '[]'::jsonb)) r;

  insert into public.split_shares
    (id, user_id, transaction_id, person, amount_minor, settled_at, settled_transaction_id)
  select (r->>'id')::uuid, v_user, (r->>'transaction_id')::uuid, r->>'person',
         (r->>'amount_minor')::bigint, nullif(r->>'settled_at', '')::timestamptz,
         nullif(r->>'settled_transaction_id', '')::uuid
  from jsonb_array_elements(coalesce(p_backup->'split_shares', '[]'::jsonb)) r;

  insert into public.meal_plans (id, user_id, term_id, name, account_id, swipes_total)
  select (r->>'id')::uuid, v_user, (r->>'term_id')::uuid, r->>'name',
         nullif(r->>'account_id', '')::uuid, nullif(r->>'swipes_total', '')::int
  from jsonb_array_elements(coalesce(p_backup->'meal_plans', '[]'::jsonb)) r;

  insert into public.meal_swipe_uses (id, user_id, meal_plan_id, used_on, swipes)
  select (r->>'id')::uuid, v_user, (r->>'meal_plan_id')::uuid,
         (r->>'used_on')::date, coalesce((r->>'swipes')::int, 1)
  from jsonb_array_elements(coalesce(p_backup->'meal_swipe_uses', '[]'::jsonb)) r;

  insert into public.student_loans
    (id, user_id, name, servicer, term_id, principal_minor, interest_rate_bp, is_subsidized, disbursed_on)
  select (r->>'id')::uuid, v_user, r->>'name', r->>'servicer',
         nullif(r->>'term_id', '')::uuid, (r->>'principal_minor')::bigint,
         coalesce((r->>'interest_rate_bp')::int, 0),
         coalesce((r->>'is_subsidized')::boolean, false), (r->>'disbursed_on')::date
  from jsonb_array_elements(coalesce(p_backup->'student_loans', '[]'::jsonb)) r;

  -- Accepts the pre-v7 key so older backups still restore.
  insert into public.recurring_entries
    (id, user_id, name, amount_minor, category_id, account_id, cadence,
     next_due_on, auto_post, is_active, last_posted_on, note, direction)
  select (r->>'id')::uuid, v_user, r->>'name', (r->>'amount_minor')::bigint,
         nullif(r->>'category_id', '')::uuid, (r->>'account_id')::uuid,
         r->>'cadence', (r->>'next_due_on')::date,
         coalesce((r->>'auto_post')::boolean, true),
         coalesce((r->>'is_active')::boolean, true),
         nullif(r->>'last_posted_on', '')::date, r->>'note',
         coalesce(nullif(r->>'direction', ''), 'out')
  from jsonb_array_elements(
    coalesce(p_backup->'recurring_entries', p_backup->'recurring_expenses', '[]'::jsonb)) r;

  insert into public.savings_goals
    (id, user_id, name, target_minor, target_date, account_id, saved_manual_minor, note)
  select (r->>'id')::uuid, v_user, r->>'name', (r->>'target_minor')::bigint,
         nullif(r->>'target_date', '')::date, nullif(r->>'account_id', '')::uuid,
         coalesce((r->>'saved_manual_minor')::bigint, 0), r->>'note'
  from jsonb_array_elements(coalesce(p_backup->'savings_goals', '[]'::jsonb)) r;

  select jsonb_build_object(
    'terms', (select count(*) from public.terms where user_id = v_user),
    'categories', (select count(*) from public.categories where user_id = v_user),
    'category_rules', (select count(*) from public.category_rules where user_id = v_user),
    'accounts', (select count(*) from public.accounts where user_id = v_user),
    'obligations', (select count(*) from public.obligations where user_id = v_user),
    'installments', (select count(*) from public.obligation_installments where user_id = v_user),
    'transfers', (select count(*) from public.transfers where user_id = v_user),
    'transactions', (select count(*) from public.transactions where user_id = v_user),
    'split_shares', (select count(*) from public.split_shares where user_id = v_user),
    'meal_plans', (select count(*) from public.meal_plans where user_id = v_user),
    'student_loans', (select count(*) from public.student_loans where user_id = v_user),
    'recurring_entries', (select count(*) from public.recurring_entries where user_id = v_user),
    'savings_goals', (select count(*) from public.savings_goals where user_id = v_user)
  ) into v_counts;

  return v_counts;
end;
$$;

revoke execute on function restore_from_backup(jsonb) from public, anon;
grant execute on function restore_from_backup(jsonb) to authenticated;
