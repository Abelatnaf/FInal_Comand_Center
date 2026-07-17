-- Second bug found by testing delete_own_account(): log_audit_change()
-- fires AFTER DELETE on every audited table (transactions, income,
-- transfers, recurring_bills, savings_goals, net_worth_snapshots,
-- accounts) and INSERTs a new audit_log row. When those deletes happen as
-- part of the auth.users cascade, the INSERT's user_id no longer has a
-- matching row in auth.users (the cascade has already removed it), so
-- audit_log_user_id_fkey rejects the insert and the whole account
-- deletion fails with a foreign key violation.
--
-- Fix: audit_log.user_id drops its FK to auth.users entirely. This isn't
-- a workaround — an audit trail legitimately shouldn't be hard-linked to
-- the live identity of the actor it describes; that's exactly why this
-- table already stores full old_data/new_data jsonb snapshots rather than
-- relying on joins. The FK was only ever going to cause exactly this kind
-- of failure the first time "delete the actor" became a real operation.
--
-- delete_own_account() now explicitly purges the caller's audit_log rows
-- AFTER deleting auth.users — deliberately after, not before, because the
-- cascade itself generates fresh "this row was deleted" audit entries as
-- a side effect of removing the user's transactions/income/etc., and
-- those need cleaning up too. Otherwise "delete my account" would leave
-- detailed jsonb snapshots of the user's financial history sitting in
-- audit_log after the fact — a real gap for a feature whose whole point
-- is letting someone remove their data.

alter table public.audit_log drop constraint audit_log_user_id_fkey;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = v_uid;
  delete from public.audit_log where user_id = v_uid;
end;
$$;
