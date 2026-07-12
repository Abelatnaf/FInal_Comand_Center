-- Audit trail: a change history for the core money-moving tables, so past
-- edits/deletes can be reviewed rather than silently overwriting history.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

-- Read-only for the owning user; only the security-definer trigger function
-- below (running as its owner, not the calling role) can write rows, so a
-- user can view but never edit or forge their own history.
create policy "audit_log_select" on public.audit_log
  for select
  using ((select auth.uid()) = user_id);

create index audit_log_user_id_changed_at_idx on public.audit_log (user_id, changed_at desc);

create or replace function public.log_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log (user_id, table_name, record_id, action, old_data, new_data)
    values (old.user_id, tg_table_name, old.id::text, tg_op, to_jsonb(old), null);
    return old;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (user_id, table_name, record_id, action, old_data, new_data)
    values (new.user_id, tg_table_name, new.id::text, tg_op, to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_log (user_id, table_name, record_id, action, old_data, new_data)
    values (new.user_id, tg_table_name, new.id::text, tg_op, null, to_jsonb(new));
    return new;
  end if;
end;
$$;

create trigger audit_transactions after insert or update or delete on public.transactions
  for each row execute function public.log_audit_change();
create trigger audit_income after insert or update or delete on public.income
  for each row execute function public.log_audit_change();
create trigger audit_transfers after insert or update or delete on public.transfers
  for each row execute function public.log_audit_change();
create trigger audit_recurring_bills after insert or update or delete on public.recurring_bills
  for each row execute function public.log_audit_change();
create trigger audit_savings_goals after insert or update or delete on public.savings_goals
  for each row execute function public.log_audit_change();
create trigger audit_net_worth_snapshots after insert or update or delete on public.net_worth_snapshots
  for each row execute function public.log_audit_change();
create trigger audit_accounts after insert or update or delete on public.accounts
  for each row execute function public.log_audit_change();
