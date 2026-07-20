-- Recreating `public` from scratch (drop schema ... cascade; create schema)
-- drops Supabase's default anon/authenticated/service_role table grants
-- along with it — not obvious until the first RLS-scoped query fails with
-- a bare "permission denied for table" (not an RLS-policy error) rather
-- than an empty result. Restore them, plus default privileges for future
-- tables/functions created in this schema.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
