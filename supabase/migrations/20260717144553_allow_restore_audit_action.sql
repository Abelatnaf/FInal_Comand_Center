-- restore_from_backup() logs a single summary audit_log row per restore
-- (RESTORE), distinct from the per-row INSERT/UPDATE/DELETE entries the
-- generic trigger writes — found via testing that the existing CHECK
-- constraint only allowed those three trigger-generated values.
alter table public.audit_log drop constraint audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check
  check (action = any (array['INSERT', 'UPDATE', 'DELETE', 'RESTORE']));
