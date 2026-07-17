-- Advisor flagged account_balance_as_of with a mutable search_path (every
-- other function in this schema sets it explicitly). SQL-language functions
-- support SET the same way plpgsql ones do — just needed to actually add it.
create or replace function public.account_balance_as_of(p_account_id uuid, p_as_of date)
returns numeric
language sql
security invoker
stable
set search_path = public
as $$
  select
    a.starting_balance
    + coalesce((select sum(i.amount_usd) from public.income i where i.account_id = a.id and i.date <= p_as_of), 0)
    - coalesce((select sum(t.amount_usd) from public.transactions t where t.account_id = a.id and t.date <= p_as_of), 0)
    + coalesce((select sum(tr.amount_usd) from public.transfers tr where tr.to_account_id = a.id and tr.date <= p_as_of), 0)
    - coalesce((select sum(tr.amount_usd) from public.transfers tr where tr.from_account_id = a.id and tr.date <= p_as_of), 0)
  from public.accounts a
  where a.id = p_account_id and a.kind = 'asset';
$$;
