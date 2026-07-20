-- Full rebuild: drop all v1 cron jobs and public schema objects.
-- (The empty 'receipts' storage bucket is left in place — Supabase's
-- storage.protect_delete() guard blocks direct SQL deletes on storage
-- tables even for an empty bucket; it's harmless and unused by v2.)
select cron.unschedule('post-recurring-bills-daily');
select cron.unschedule('post-recurring-income-daily');
select cron.unschedule('weekly-data-backups');

drop schema public cascade;
create schema public;
grant usage on schema public to public;
grant all on schema public to postgres;
