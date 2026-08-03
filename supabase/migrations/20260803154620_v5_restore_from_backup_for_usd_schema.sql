-- Restore rewritten for the USD-only, payer-free schema.
--
-- Worth recording: the old version needed a role-gated escape hatch in the
-- transactions trigger so a historical ETB row could be re-inserted at the
-- rate it was originally frozen at, instead of being silently repriced at
-- today's rate. With one currency there is no rate to freeze and nothing to
-- reprice, so that whole mechanism is gone rather than carried forward.
create or replace function restore_from_backup(p_backup jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
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
  delete from public.category_rules where user_id = v_user;
  delete from public.accounts where user_id = v_user;
  delete from public.categories where user_id = v_user;
  delete from public.settings where user_id = v_user;

  insert into public.settings (user_id, tracking_start_date, display_name, onboarding_completed)
  select v_user, nullif(r->>'tracking_start_date', '')::date, r->>'display_name',
         coalesce((r->>'onboarding_completed')::boolean, true)
  from jsonb_array_elements(coalesce(p_backup->'settings', '[]'::jsonb)) r;

  -- A backup that predates the settings row still has to leave the user with
  -- one, or nothing that reads it will work.
  insert into public.settings (user_id, tracking_start_date, onboarding_completed)
  select v_user, current_date, true
  where not exists (select 1 from public.settings where user_id = v_user);

  insert into public.categories
    (id, user_id, name, kind, color, icon, monthly_budget_usd_minor, sort_order, is_archived)
  select (r->>'id')::uuid, v_user, r->>'name', r->>'kind',
         coalesce(r->>'color', 'slate'), coalesce(r->>'icon', '•'),
         nullif(r->>'monthly_budget_usd_minor', '')::bigint,
         coalesce((r->>'sort_order')::int, 0),
         coalesce((r->>'is_archived')::boolean, false)
  from jsonb_array_elements(coalesce(p_backup->'categories', '[]'::jsonb)) r;

  insert into public.accounts
    (id, user_id, name, kind, institution, opening_balance_minor, credit_limit_minor, is_archived)
  select (r->>'id')::uuid, v_user, r->>'name',
         coalesce(nullif(r->>'kind', ''), 'checking'), r->>'institution',
         coalesce((r->>'opening_balance_minor')::bigint, 0),
         nullif(r->>'credit_limit_minor', '')::bigint,
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
         nullif(r->>'recur_spawned_at', '')::timestamptz,
         r->>'statement_path'
  from jsonb_array_elements(coalesce(p_backup->'obligations', '[]'::jsonb)) r;

  insert into public.obligation_installments
    (id, user_id, obligation_id, seq, due_on, amount_usd_minor)
  select (r->>'id')::uuid, v_user, (r->>'obligation_id')::uuid, (r->>'seq')::int,
         nullif(r->>'due_on', '')::date, (r->>'amount_usd_minor')::bigint
  from jsonb_array_elements(coalesce(p_backup->'obligation_installments', '[]'::jsonb)) r;

  insert into public.transfers
    (id, user_id, occurred_on, from_account_id, to_account_id, amount_minor, note)
  select (r->>'id')::uuid, v_user, (r->>'occurred_on')::date,
         (r->>'from_account_id')::uuid, (r->>'to_account_id')::uuid,
         coalesce((r->>'amount_minor')::bigint, (r->>'from_amount_minor')::bigint),
         r->>'note'
  from jsonb_array_elements(coalesce(p_backup->'transfers', '[]'::jsonb)) r;

  insert into public.transactions
    (id, user_id, account_id, occurred_on, direction, amount_minor, category_id,
     note, obligation_id, receipt_path, tags, is_tax_deductible)
  select (r->>'id')::uuid, v_user, (r->>'account_id')::uuid,
         (r->>'occurred_on')::date, r->>'direction', (r->>'amount_minor')::bigint,
         nullif(r->>'category_id', '')::uuid, r->>'note',
         nullif(r->>'obligation_id', '')::uuid, r->>'receipt_path',
         coalesce((select array_agg(value::text) from jsonb_array_elements_text(
                     case when jsonb_typeof(r->'tags') = 'array' then r->'tags' else '[]'::jsonb end
                   ) value), '{}'),
         coalesce((r->>'is_tax_deductible')::boolean, false)
  from jsonb_array_elements(coalesce(p_backup->'transactions', '[]'::jsonb)) r;

  insert into public.recurring_expenses
    (id, user_id, name, amount_minor, category_id, account_id, cadence,
     next_due_on, auto_post, is_active, last_posted_on, note)
  select (r->>'id')::uuid, v_user, r->>'name', (r->>'amount_minor')::bigint,
         nullif(r->>'category_id', '')::uuid, (r->>'account_id')::uuid,
         r->>'cadence', (r->>'next_due_on')::date,
         coalesce((r->>'auto_post')::boolean, true),
         coalesce((r->>'is_active')::boolean, true),
         nullif(r->>'last_posted_on', '')::date, r->>'note'
  from jsonb_array_elements(coalesce(p_backup->'recurring_expenses', '[]'::jsonb)) r;

  insert into public.savings_goals
    (id, user_id, name, target_minor, target_date, account_id, saved_manual_minor, note)
  select (r->>'id')::uuid, v_user, r->>'name', (r->>'target_minor')::bigint,
         nullif(r->>'target_date', '')::date, nullif(r->>'account_id', '')::uuid,
         coalesce((r->>'saved_manual_minor')::bigint, 0), r->>'note'
  from jsonb_array_elements(coalesce(p_backup->'savings_goals', '[]'::jsonb)) r;

  select jsonb_build_object(
    'categories', (select count(*) from public.categories where user_id = v_user),
    'category_rules', (select count(*) from public.category_rules where user_id = v_user),
    'accounts', (select count(*) from public.accounts where user_id = v_user),
    'obligations', (select count(*) from public.obligations where user_id = v_user),
    'installments', (select count(*) from public.obligation_installments where user_id = v_user),
    'transfers', (select count(*) from public.transfers where user_id = v_user),
    'transactions', (select count(*) from public.transactions where user_id = v_user),
    'recurring_expenses', (select count(*) from public.recurring_expenses where user_id = v_user),
    'savings_goals', (select count(*) from public.savings_goals where user_id = v_user)
  ) into v_counts;

  return v_counts;
end;
$$;

revoke execute on function restore_from_backup(jsonb) from public, anon;
grant execute on function restore_from_backup(jsonb) to authenticated;
