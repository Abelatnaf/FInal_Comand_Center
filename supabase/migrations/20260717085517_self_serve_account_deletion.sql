-- Self-serve account deletion, part of the compliance pass for having real
-- third-party users. Two things:
--
-- 1. Real bug found while checking FK delete rules before writing the
--    deletion function: every public.*.user_id FK to auth.users(id) cascades
--    EXCEPT recurring_income_user_id_fkey, which was left as NO ACTION when
--    the recurring-income feature was added. Left as-is, a user delete would
--    fail outright with a FK violation the moment they had a recurring
--    income row. Fixed to cascade like every sibling table.
--
-- 2. public.delete_own_account(): security definer (owned by postgres, so it
--    can delete from auth.users directly — the standard Supabase self-serve
--    delete pattern). Captures auth.uid() first, removes the caller's
--    Storage objects in the receipts bucket (storage.objects has no FK to
--    auth.users, so cascade doesn't reach it), then deletes the auth.users
--    row. Every public.* table cascades from auth.users (now including
--    recurring_income), so this one delete is sufficient for all app data.
--    Granted to authenticated only — unlike the trigger-only functions
--    elsewhere in this schema, this one is meant to be called directly.

alter table public.recurring_income
  drop constraint recurring_income_user_id_fkey,
  add constraint recurring_income_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

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

  delete from storage.objects
  where bucket_id = 'receipts'
    and (storage.foldername(name))[1] = v_uid::text;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
