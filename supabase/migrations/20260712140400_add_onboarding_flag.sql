-- Tracks whether a user has dismissed the first-run onboarding wizard, so it
-- only shows once (and doesn't reappear just because their account happens
-- to still have zero transactions/income logged).
alter table public.settings add column onboarding_dismissed boolean not null default false;
