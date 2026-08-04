-- Renaming a table leaves its indexes under the old name. Harmless, but a
-- `recurring_expenses_user_idx` on a table called `recurring_entries` is the
-- kind of thing that costs someone ten minutes in two years.
alter index if exists recurring_expenses_user_idx rename to recurring_entries_user_idx;
alter index if exists recurring_expenses_account_idx rename to recurring_entries_account_idx;
alter index if exists recurring_expenses_category_idx rename to recurring_entries_category_idx;
