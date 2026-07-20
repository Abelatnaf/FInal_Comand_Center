-- Real bug caught by get_advisors after the migration above: v2_grants'
-- blanket `grant all on all functions in schema public to anon,
-- authenticated, service_role` silently re-granted direct RPC execute on
-- handle_new_user() to anon/authenticated, undoing the explicit revoke at
-- the end of v2_schema.sql. Re-revoke it — Postgres still fires the
-- trigger internally regardless of this grant, so this only blocks someone
-- calling it directly as an RPC.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
