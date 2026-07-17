alter table public.transactions
  add column is_tax_deductible boolean not null default false;
