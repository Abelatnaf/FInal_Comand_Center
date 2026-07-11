create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger-only function; Postgres invokes it internally regardless of
-- EXECUTE grants, so revoking direct RPC callability is safe.
revoke execute on function public.set_computed_fields() from public, anon, authenticated;
