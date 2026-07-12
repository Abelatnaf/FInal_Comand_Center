alter table public.net_worth_snapshot_balances
  add constraint net_worth_snapshot_balances_unique unique (snapshot_id, account_id);
