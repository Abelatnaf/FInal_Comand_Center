-- Receipts attach to payments, but the bill they came from couldn't hold the
-- statement itself -- which is the document you actually need when querying a
-- charge. Reuses the existing private `receipts` bucket rather than adding a
-- second one: its policies key off the first path segment being auth.uid(),
-- so "<user_id>/obligations/<obligation_id>/statement.<ext>" is already
-- covered with no new storage rules.
alter table public.obligations add column statement_path text;
