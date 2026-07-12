-- settings.id lost its "default 1" when the singleton constraint was dropped
-- for multi-tenancy, but never got a replacement default -- new rows (one per
-- user now) need an auto-generated id. Back it with a real sequence, seeded
-- past any existing id so it can't collide.
create sequence if not exists public.settings_id_seq;
select setval('public.settings_id_seq', greatest(1, (select coalesce(max(id), 0) from public.settings)));
alter table public.settings alter column id set default nextval('public.settings_id_seq');
alter sequence public.settings_id_seq owned by public.settings.id;
