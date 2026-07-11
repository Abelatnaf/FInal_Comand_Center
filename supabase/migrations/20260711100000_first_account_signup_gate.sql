-- Allows the login page to offer an in-app "Create Account" flow, but only
-- until the single account exists. Security definer so it can see auth.users
-- (normally locked down), but it only ever returns a boolean — no row data.
create or replace function public.can_create_first_account()
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (select 1 from auth.users);
$$;

revoke all on function public.can_create_first_account() from public;
grant execute on function public.can_create_first_account() to anon, authenticated;

notify pgrst, 'reload schema';
