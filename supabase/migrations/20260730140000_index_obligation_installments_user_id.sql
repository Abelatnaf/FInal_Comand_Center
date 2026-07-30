-- Every other table in this schema carries a `<table>_user_idx` on user_id,
-- because the RLS policy on all of them filters by exactly that column --
-- obligation_installments was the one that shipped without it. Caught by
-- get_advisors (unindexed_foreign_keys), not by noticing it by hand.
create index obligation_installments_user_idx
  on public.obligation_installments (user_id);
