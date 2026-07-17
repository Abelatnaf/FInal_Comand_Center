-- Corrects the delete_own_account() function from the previous migration.
-- Discovered via a rollback-only test that this project has a
-- storage.protect_delete() trigger blocking direct SQL deletes on
-- storage.objects ("Use the Storage API instead") — a hardening measure
-- Supabase applies that the original function didn't account for.
-- Storage cleanup for the receipts bucket now happens at the application
-- layer (server action calling supabase.storage.from('receipts').remove(),
-- which goes through the sanctioned Storage API and is scoped by the
-- existing per-user-folder RLS policy) before this RPC is called. This
-- function's job narrows to what SQL can actually do: delete the
-- auth.users row, which cascades every public.* table.

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
end;
$$;
