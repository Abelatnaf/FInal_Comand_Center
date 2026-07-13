-- Link transactions/income to the account they were paid from/deposited into.
-- Nullable: existing rows (and any future entry that doesn't specify an
-- account) stay valid — this is additive, not a backfill.
alter table public.transactions
  add column account_id uuid references public.accounts(id) on delete set null;

alter table public.income
  add column account_id uuid references public.accounts(id) on delete set null;

create index transactions_account_id_idx on public.transactions(account_id);
create index income_account_id_idx on public.income(account_id);
