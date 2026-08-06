-- Backup coverage for the two new tables.
--
-- Adding a table without teaching restore_from_backup about it makes every
-- backup taken afterwards silently lossy -- restore would wipe the user's
-- recurring splits and leave the charges unsplit. This project has closed the
-- same gap three times now (transfers in v5, the student tables in v6, the
-- terms/splits/meal-plan set in v7), so it is closed in the same pass here.
--
-- Only two hunks change; the rest of the function is carried through unaltered.

do $$
declare src text;
begin
  select pg_get_functiondef(p.oid) into src
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'restore_from_backup';

  -- Cleared before recurring_entries, which they reference.
  src := replace(
    src,
    '  delete from public.split_shares where user_id = v_user;',
    '  delete from public.split_template_shares where user_id = v_user;'  || chr(10) ||
    '  delete from public.split_templates where user_id = v_user;'        || chr(10) ||
    '  delete from public.split_shares where user_id = v_user;'
  );

  -- Restored after recurring_entries, which they reference.
  src := replace(
    src,
    '  insert into public.savings_goals' || chr(10) ||
    '    (id, user_id, name, target_minor, target_date, account_id, saved_manual_minor, note)',
    '  insert into public.split_templates (id, user_id, recurring_entry_id)'        || chr(10) ||
    '  select (r->>''id'')::uuid, v_user, (r->>''recurring_entry_id'')::uuid'       || chr(10) ||
    '  from jsonb_array_elements(coalesce(p_backup->''split_templates'', ''[]''::jsonb)) r;' || chr(10) ||
    ''                                                                              || chr(10) ||
    '  insert into public.split_template_shares (id, user_id, template_id, person, share_bp)' || chr(10) ||
    '  select (r->>''id'')::uuid, v_user, (r->>''template_id'')::uuid, r->>''person'',' || chr(10) ||
    '         (r->>''share_bp'')::int'                                              || chr(10) ||
    '  from jsonb_array_elements(coalesce(p_backup->''split_template_shares'', ''[]''::jsonb)) r;' || chr(10) ||
    ''                                                                              || chr(10) ||
    '  insert into public.savings_goals'                                            || chr(10) ||
    '    (id, user_id, name, target_minor, target_date, account_id, saved_manual_minor, note)'
  );

  src := replace(
    src,
    '''savings_goals'', (select count(*) from public.savings_goals where user_id = v_user)',
    '''split_templates'', (select count(*) from public.split_templates where user_id = v_user),' || chr(10) ||
    '    ''savings_goals'', (select count(*) from public.savings_goals where user_id = v_user)'
  );

  execute src;
end $$;

revoke execute on function restore_from_backup(jsonb) from public, anon;
grant execute on function restore_from_backup(jsonb) to authenticated;
