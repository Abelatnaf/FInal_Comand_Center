-- Third bug found by testing delete_own_account(): transactions.category_id,
-- transaction_splits.category_id, and recurring_bills.category_id were all
-- left as the Postgres default ON DELETE NO ACTION, while every account_id
-- FK in the same tables already correctly uses ON DELETE SET NULL (see the
-- multi-tenant migration's note that account_id FKs use "set null when an
-- account is deleted"). That inconsistency was invisible in normal use
-- (this app has never had a delete-category feature), but a single-user
-- account purge deletes categories and their referencing rows in the same
-- statement via independent cascade paths from auth.users, and Postgres
-- doesn't guarantee those parallel cascades resolve in dependency order —
-- it can attempt to delete a category row before the transaction_splits
-- row still pointing at it has been removed, and NO ACTION rejects that.
--
-- category_id is nullable in all three tables already, so SET NULL is a
-- safe, meaning-preserving fix here — not just a workaround for the
-- deletion path, but the same correctness fix account_id already got.

alter table public.transactions
  drop constraint transactions_category_id_fkey,
  add constraint transactions_category_id_fkey
    foreign key (category_id) references public.categories(id) on delete set null;

alter table public.transaction_splits
  drop constraint transaction_splits_category_id_fkey,
  add constraint transaction_splits_category_id_fkey
    foreign key (category_id) references public.categories(id) on delete set null;

alter table public.recurring_bills
  drop constraint recurring_bills_category_id_fkey,
  add constraint recurring_bills_category_id_fkey
    foreign key (category_id) references public.categories(id) on delete set null;
