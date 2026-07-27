-- Recreating `public` from scratch drops Supabase's default anon/
-- authenticated/service_role table grants along with it (learned the hard
-- way during the v2 rebuild -- surfaces as a bare "permission denied for
-- table", not an RLS error). Restore them, plus default privileges for
-- future objects. No security-definer/RPC-exposed function exists in this
-- schema (the fx-freeze trigger is security invoker and can only run as a
-- trigger), so unlike v2's handle_new_user() incident, this blanket grant
-- has no lockdown to undo afterward.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
