-- Remove Key Dates and Budget Periods (Semester Planner) features entirely.
-- Approved by Abel via AskUserQuestion during the "senior finance officer" review pass —
-- both were cadet-era leftovers with no path for a general user to use meaningfully.
-- This is destructive: drops Abel's 10 real key_dates rows and 2 real semesters rows.
-- He confirmed the deletion explicitly (not a "no preference" default).

drop view if exists public.semester_pacing;
drop table if exists public.key_dates;
drop table if exists public.semesters;
