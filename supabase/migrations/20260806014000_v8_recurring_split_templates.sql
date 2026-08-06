-- Recurring splits: rent and utilities, where the same people owe you the
-- same share every month.
--
-- A template hangs off a recurring entry. When that entry posts, the shares
-- post with it -- and that logic lives in post_due_recurring_entries() rather
-- than in a server action on purpose. The posting function is what pg_cron
-- calls; v5 already learned this exact lesson with auto-categorisation rules,
-- where putting the logic in one server action silently skipped the cron job,
-- CSV import and the offline-queue replay.

create table split_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recurring_entry_id uuid not null references recurring_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- One template per recurring entry: two competing templates on the same
  -- charge would make "who owes what" ambiguous every time it posts.
  unique (recurring_entry_id)
);

create table split_template_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references split_templates(id) on delete cascade,
  person text not null check (length(trim(person)) > 0),
  -- Basis points of the charge rather than a fixed amount: a utility bill
  -- changes every month, and a share that doesn't follow it would quietly
  -- drift away from what the person actually owes.
  share_bp integer not null check (share_bp > 0 and share_bp <= 10000),
  created_at timestamptz not null default now(),
  unique (template_id, person)
);

create index split_templates_user_idx on split_templates(user_id);
create index split_templates_entry_idx on split_templates(recurring_entry_id);
create index split_template_shares_user_idx on split_template_shares(user_id);
create index split_template_shares_template_idx on split_template_shares(template_id);

alter table split_templates enable row level security;
alter table split_template_shares enable row level security;

create policy split_templates_own on split_templates
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy split_template_shares_own on split_template_shares
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on split_templates to authenticated;
grant select, insert, update, delete on split_template_shares to authenticated;

-- Ownership triggers, written SECURITY DEFINER from the start. An earlier
-- pass shipped these as SECURITY INVOKER and broke every write in production,
-- because assert_owned is deliberately revoked from authenticated.
create or replace function validate_split_template_refs()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  perform public.assert_owned('recurring_entries', new.recurring_entry_id, new.user_id, 'Recurring entry');
  return new;
end;
$$;

create or replace function validate_split_template_share_refs()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  perform public.assert_owned('split_templates', new.template_id, new.user_id, 'Split template');
  return new;
end;
$$;

revoke execute on function validate_split_template_refs() from public, anon, authenticated;
revoke execute on function validate_split_template_share_refs() from public, anon, authenticated;

create trigger split_templates_validate_refs
  before insert or update on split_templates
  for each row execute function validate_split_template_refs();

create trigger split_template_shares_validate_refs
  before insert or update on split_template_shares
  for each row execute function validate_split_template_share_refs();

-- Total shares can't exceed the charge, mirroring the rule addSplit() already
-- enforces by hand. 10000bp is the whole thing.
create or replace function assert_template_shares_within_bounds()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_total integer;
begin
  select coalesce(sum(share_bp), 0) into v_total
  from public.split_template_shares
  where template_id = coalesce(new.template_id, old.template_id)
    and id <> coalesce(new.id, old.id);

  if v_total + coalesce(new.share_bp, 0) > 10000 then
    raise exception 'Those shares add up to more than the whole charge.';
  end if;
  return new;
end;
$$;

revoke execute on function assert_template_shares_within_bounds() from public, anon, authenticated;

create trigger split_template_shares_within_bounds
  before insert or update on split_template_shares
  for each row execute function assert_template_shares_within_bounds();
