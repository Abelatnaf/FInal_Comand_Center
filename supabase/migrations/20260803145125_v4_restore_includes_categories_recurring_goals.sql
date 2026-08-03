-- Teaches the restore about categories, recurring expenses and savings goals,
-- and about transactions carrying category_id instead of a category label.
-- Without this a backup taken today would silently wipe all three tables and
-- strip every transaction's category on restore.

create or replace function public.restore_from_backup(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_counts jsonb;
begin
  if v_user is null then
    raise exception 'Must be signed in to restore';
  end if;

  if p_backup is null or jsonb_typeof(p_backup) <> 'object' then
    raise exception 'Backup is not a JSON object';
  end if;

  if not (p_backup ? 'transactions') or not (p_backup ? 'accounts') then
    raise exception 'This does not look like a Command Deck backup';
  end if;

  -- FK-safe order. transfers, transactions and recurring_expenses all
  -- reference accounts with ON DELETE RESTRICT, so they clear first.
  delete from public.transactions where user_id = v_user;
  delete from public.transfers where user_id = v_user;
  delete from public.recurring_expenses where user_id = v_user;
  delete from public.savings_goals where user_id = v_user;
  delete from public.obligation_installments where user_id = v_user;
  delete from public.obligations where user_id = v_user;
  delete from public.fx_rates where user_id = v_user;
  delete from public.accounts where user_id = v_user;
  delete from public.categories where user_id = v_user;
  delete from public.payers where user_id = v_user;
  delete from public.settings where user_id = v_user;

  insert into public.settings (user_id, tracking_start_date)
  select v_user, nullif(r->>'tracking_start_date', '')::date
  from jsonb_array_elements(coalesce(p_backup->'settings', '[]'::jsonb)) r;

  insert into public.payers (id, user_id, key, label, class_year, is_default)
  select (r->>'id')::uuid, v_user, r->>'key', r->>'label',
         nullif(r->>'class_year', '')::int,
         coalesce((r->>'is_default')::boolean, false)
  from jsonb_array_elements(coalesce(p_backup->'payers', '[]'::jsonb)) r;

  insert into public.categories
    (id, user_id, name, kind, color, icon, monthly_budget_usd_minor,
     sort_order, is_archived)
  select (r->>'id')::uuid, v_user, r->>'name', r->>'kind',
         coalesce(r->>'color', 'slate'),
         coalesce(r->>'icon', '•'),
         nullif(r->>'monthly_budget_usd_minor', '')::bigint,
         coalesce((r->>'sort_order')::int, 0),
         coalesce((r->>'is_archived')::boolean, false)
  from jsonb_array_elements(coalesce(p_backup->'categories', '[]'::jsonb)) r;

  insert into public.accounts
    (id, user_id, name, currency, kind, opening_balance_minor, is_archived)
  select (r->>'id')::uuid, v_user, r->>'name', r->>'currency', r->>'kind',
         coalesce((r->>'opening_balance_minor')::bigint, 0),
         coalesce((r->>'is_archived')::boolean, false)
  from jsonb_array_elements(coalesce(p_backup->'accounts', '[]'::jsonb)) r;

  insert into public.fx_rates (id, user_id, effective_on, etb_per_usd, source)
  select (r->>'id')::uuid, v_user, (r->>'effective_on')::date,
         (r->>'etb_per_usd')::numeric, r->>'source'
  from jsonb_array_elements(coalesce(p_backup->'fx_rates', '[]'::jsonb)) r;

  insert into public.obligations
    (id, user_id, payer_id, title, due_on, amount_usd_minor, source_note,
     waived_at, recur_interval_months, recur_spawned_at, statement_path)
  select (r->>'id')::uuid, v_user, (r->>'payer_id')::uuid, r->>'title',
         nullif(r->>'due_on', '')::date,
         coalesce((r->>'amount_usd_minor')::bigint, 0),
         r->>'source_note',
         nullif(r->>'waived_at', '')::timestamptz,
         nullif(r->>'recur_interval_months', '')::int,
         nullif(r->>'recur_spawned_at', '')::timestamptz,
         r->>'statement_path'
  from jsonb_array_elements(coalesce(p_backup->'obligations', '[]'::jsonb)) r;

  insert into public.obligation_installments
    (id, user_id, obligation_id, seq, due_on, amount_usd_minor)
  select (r->>'id')::uuid, v_user, (r->>'obligation_id')::uuid,
         (r->>'seq')::int, nullif(r->>'due_on', '')::date,
         (r->>'amount_usd_minor')::bigint
  from jsonb_array_elements(coalesce(p_backup->'obligation_installments', '[]'::jsonb)) r;

  insert into public.transfers
    (id, user_id, occurred_on, from_account_id, to_account_id,
     from_amount_minor, to_amount_minor, note)
  select (r->>'id')::uuid, v_user, (r->>'occurred_on')::date,
         (r->>'from_account_id')::uuid, (r->>'to_account_id')::uuid,
         (r->>'from_amount_minor')::bigint, (r->>'to_amount_minor')::bigint,
         r->>'note'
  from jsonb_array_elements(coalesce(p_backup->'transfers', '[]'::jsonb)) r;

  -- fx_rate_etb_per_usd is supplied explicitly here; the trigger's role gate
  -- honours it because this function executes as postgres.
  insert into public.transactions
    (id, user_id, payer_id, account_id, occurred_on, direction, amount_minor,
     currency, fx_rate_etb_per_usd, category_id, note, obligation_id, receipt_path)
  select (r->>'id')::uuid, v_user, (r->>'payer_id')::uuid,
         (r->>'account_id')::uuid, (r->>'occurred_on')::date,
         r->>'direction', (r->>'amount_minor')::bigint, r->>'currency',
         (r->>'fx_rate_etb_per_usd')::numeric,
         nullif(r->>'category_id', '')::uuid, r->>'note',
         nullif(r->>'obligation_id', '')::uuid,
         r->>'receipt_path'
  from jsonb_array_elements(coalesce(p_backup->'transactions', '[]'::jsonb)) r;

  insert into public.recurring_expenses
    (id, user_id, name, amount_minor, category_id, account_id, payer_id,
     cadence, next_due_on, auto_post, is_active, last_posted_on, note)
  select (r->>'id')::uuid, v_user, r->>'name', (r->>'amount_minor')::bigint,
         nullif(r->>'category_id', '')::uuid, (r->>'account_id')::uuid,
         (r->>'payer_id')::uuid, r->>'cadence', (r->>'next_due_on')::date,
         coalesce((r->>'auto_post')::boolean, true),
         coalesce((r->>'is_active')::boolean, true),
         nullif(r->>'last_posted_on', '')::date,
         r->>'note'
  from jsonb_array_elements(coalesce(p_backup->'recurring_expenses', '[]'::jsonb)) r;

  insert into public.savings_goals
    (id, user_id, name, target_minor, currency, target_date, account_id,
     saved_manual_minor, note)
  select (r->>'id')::uuid, v_user, r->>'name', (r->>'target_minor')::bigint,
         r->>'currency', nullif(r->>'target_date', '')::date,
         nullif(r->>'account_id', '')::uuid,
         coalesce((r->>'saved_manual_minor')::bigint, 0),
         r->>'note'
  from jsonb_array_elements(coalesce(p_backup->'savings_goals', '[]'::jsonb)) r;

  select jsonb_build_object(
    'payers', (select count(*) from public.payers where user_id = v_user),
    'categories', (select count(*) from public.categories where user_id = v_user),
    'accounts', (select count(*) from public.accounts where user_id = v_user),
    'fx_rates', (select count(*) from public.fx_rates where user_id = v_user),
    'obligations', (select count(*) from public.obligations where user_id = v_user),
    'installments', (select count(*) from public.obligation_installments where user_id = v_user),
    'transfers', (select count(*) from public.transfers where user_id = v_user),
    'transactions', (select count(*) from public.transactions where user_id = v_user),
    'recurring_expenses', (select count(*) from public.recurring_expenses where user_id = v_user),
    'savings_goals', (select count(*) from public.savings_goals where user_id = v_user)
  ) into v_counts;

  return v_counts;
end;
$function$;
