-- Real bug: _build_user_backup_json(p_user_id uuid) was left callable by
-- anon/authenticated via its auto-exposed RPC endpoint. Since it's
-- security definer and takes an ARBITRARY user_id, anyone could have
-- called it with someone else's uuid and gotten back their entire
-- financial data as JSON — a serious cross-tenant data leak. It's meant
-- to be an internal helper for create_backup_for_user() (which is scoped
-- to auth.uid(), safe) and the cron-only bulk function — never called
-- directly. Locking it down the same way every other internal/cron-only
-- function in this schema already is.
revoke all on function public._build_user_backup_json(uuid) from public, anon, authenticated;
