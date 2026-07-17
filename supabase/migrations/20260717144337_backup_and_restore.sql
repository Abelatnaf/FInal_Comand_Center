create table public.data_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('manual', 'scheduled')),
  data jsonb not null
);

alter table public.data_backups enable row level security;

create policy owner_select on public.data_backups
  for select
  using ((select auth.uid()) = user_id);

create policy owner_delete on public.data_backups
  for delete
  using ((select auth.uid()) = user_id);

create index data_backups_user_id_idx on public.data_backups(user_id, created_at desc);

-- Builds one user's full exportable snapshot. Mirrors exportAllData()'s
-- shape (app/(app)/settings/actions.ts) closely enough to restore from.
create or replace function public._build_user_backup_json(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'settings', (select to_jsonb(s) from settings s where s.user_id = p_user_id),
    'currencies', coalesce((select jsonb_agg(to_jsonb(cu)) from currencies cu where cu.user_id = p_user_id), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(to_jsonb(c)) from categories c where c.user_id = p_user_id), '[]'::jsonb),
    'accounts', coalesce((select jsonb_agg(to_jsonb(a)) from accounts a where a.user_id = p_user_id), '[]'::jsonb),
    'transactions', coalesce((select jsonb_agg(to_jsonb(t)) from transactions t where t.user_id = p_user_id), '[]'::jsonb),
    'transaction_splits', coalesce((select jsonb_agg(to_jsonb(ts)) from transaction_splits ts join transactions t on t.id = ts.transaction_id where t.user_id = p_user_id), '[]'::jsonb),
    'income', coalesce((select jsonb_agg(to_jsonb(i)) from income i where i.user_id = p_user_id), '[]'::jsonb),
    'transfers', coalesce((select jsonb_agg(to_jsonb(tr)) from transfers tr where tr.user_id = p_user_id), '[]'::jsonb),
    'recurring_bills', coalesce((select jsonb_agg(to_jsonb(rb)) from recurring_bills rb where rb.user_id = p_user_id), '[]'::jsonb),
    'recurring_income', coalesce((select jsonb_agg(to_jsonb(ri)) from recurring_income ri where ri.user_id = p_user_id), '[]'::jsonb),
    'savings_goals', coalesce((select jsonb_agg(to_jsonb(sg)) from savings_goals sg where sg.user_id = p_user_id), '[]'::jsonb),
    'net_worth_snapshots', coalesce((select jsonb_agg(to_jsonb(nws)) from net_worth_snapshots nws where nws.user_id = p_user_id), '[]'::jsonb),
    'net_worth_snapshot_balances', coalesce((select jsonb_agg(to_jsonb(nwsb)) from net_worth_snapshot_balances nwsb join net_worth_snapshots nws on nws.id = nwsb.snapshot_id where nws.user_id = p_user_id), '[]'::jsonb)
  );
$$;

create or replace function public.create_backup_for_user()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  insert into data_backups (user_id, source, data)
  values (v_uid, 'manual', _build_user_backup_json(v_uid))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.create_backup_for_user() from public, anon;
grant execute on function public.create_backup_for_user() to authenticated;

-- Cron-only (pg_cron, weekly): snapshots every user, keeping the 8 most
-- recent SCHEDULED backups per user (manual ones are never auto-pruned).
-- Same per-row exception-catch pattern as post_due_recurring_bills() —
-- one user's failure must not abort the whole batch.
create or replace function public.create_weekly_backups_for_all_users()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
begin
  for v_user in select distinct user_id from settings
  loop
    begin
      insert into data_backups (user_id, source, data)
      values (v_user.user_id, 'scheduled', _build_user_backup_json(v_user.user_id));

      delete from data_backups
      where id in (
        select id from data_backups
        where user_id = v_user.user_id and source = 'scheduled'
        order by created_at desc
        offset 8
      );
    exception when others then
      raise warning 'create_weekly_backups_for_all_users: skipped user % (%)', v_user.user_id, sqlerrm;
    end;
  end loop;
end;
$$;

revoke all on function public.create_weekly_backups_for_all_users() from public, anon, authenticated;

select cron.schedule('weekly-data-backups', '0 12 * * 1', $$select public.create_weekly_backups_for_all_users()$$);

-- Full wipe-and-restore from a backup. See migration comment history for
-- why settings/currencies are restored BEFORE transactions/income: the
-- set_computed_fields() trigger locks in fx_rate_used/amount_usd/week_number
-- by reading LIVE settings.tracking_start_date and currencies.rate_to_usd
-- at insert time. Restoring those two first means the trigger naturally
-- recomputes the same figures the backup captured — no need to fight or
-- bypass it, and no risk of silently re-pricing historical transactions
-- at today's rate (the exact bug class already fixed once this session
-- for the transaction-edit path).
create or replace function public.restore_from_backup(p_backup_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_data jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select data into v_data from data_backups where id = p_backup_id and user_id = v_uid;
  if v_data is null then
    raise exception 'Backup not found';
  end if;

  -- A restore is a deliberate full reset the user explicitly confirmed;
  -- closed periods shouldn't block it the way they'd block a casual edit.
  -- The reopen itself is audited via the existing trigger on period_closes.
  update period_closes
  set status = 'reconciling', reopen_reason = 'Restored from a backup on ' || to_char(now(), 'YYYY-MM-DD')
  where user_id = v_uid and status = 'closed';

  delete from net_worth_snapshots where user_id = v_uid;
  delete from transactions where user_id = v_uid;
  delete from income where user_id = v_uid;
  delete from transfers where user_id = v_uid;
  delete from recurring_bills where user_id = v_uid;
  delete from recurring_income where user_id = v_uid;
  delete from savings_goals where user_id = v_uid;
  delete from accounts where user_id = v_uid;
  delete from categories where user_id = v_uid;
  delete from currencies where user_id = v_uid;

  update settings set
    tracking_start_date = (v_data->'settings'->>'tracking_start_date')::date,
    low_balance_threshold = (v_data->'settings'->>'low_balance_threshold')::numeric,
    onboarding_dismissed = coalesce((v_data->'settings'->>'onboarding_dismissed')::boolean, false),
    notify_weekly_digest = coalesce((v_data->'settings'->>'notify_weekly_digest')::boolean, false),
    notify_budget_alerts = coalesce((v_data->'settings'->>'notify_budget_alerts')::boolean, false),
    notify_bill_reminders = coalesce((v_data->'settings'->>'notify_bill_reminders')::boolean, false)
  where user_id = v_uid;

  insert into currencies select * from jsonb_populate_recordset(null::currencies, v_data->'currencies');
  insert into categories select * from jsonb_populate_recordset(null::categories, v_data->'categories');
  insert into accounts select * from jsonb_populate_recordset(null::accounts, v_data->'accounts');

  insert into transactions select * from jsonb_populate_recordset(null::transactions, v_data->'transactions');
  insert into transaction_splits select * from jsonb_populate_recordset(null::transaction_splits, v_data->'transaction_splits');
  insert into income select * from jsonb_populate_recordset(null::income, v_data->'income');
  insert into transfers select * from jsonb_populate_recordset(null::transfers, v_data->'transfers');
  insert into recurring_bills select * from jsonb_populate_recordset(null::recurring_bills, v_data->'recurring_bills');
  insert into recurring_income select * from jsonb_populate_recordset(null::recurring_income, v_data->'recurring_income');
  insert into savings_goals select * from jsonb_populate_recordset(null::savings_goals, v_data->'savings_goals');
  insert into net_worth_snapshots select * from jsonb_populate_recordset(null::net_worth_snapshots, v_data->'net_worth_snapshots');
  insert into net_worth_snapshot_balances select * from jsonb_populate_recordset(null::net_worth_snapshot_balances, v_data->'net_worth_snapshot_balances');

  insert into audit_log (user_id, table_name, record_id, action, old_data, new_data)
  values (v_uid, 'data_backups', p_backup_id::text, 'RESTORE', null, jsonb_build_object('backup_id', p_backup_id));
end;
$$;

revoke all on function public.restore_from_backup(uuid) from public, anon;
grant execute on function public.restore_from_backup(uuid) to authenticated;
