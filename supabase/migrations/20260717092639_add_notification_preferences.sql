-- Email notification preferences. Delivery itself happens outside Postgres
-- (a Vercel Cron-triggered route handler, using the service-role key to
-- read across all opted-in users) — these columns just record what each
-- user asked for.
alter table public.settings
  add column notify_weekly_digest boolean not null default false,
  add column notify_budget_alerts boolean not null default false,
  add column notify_bill_reminders boolean not null default false;
