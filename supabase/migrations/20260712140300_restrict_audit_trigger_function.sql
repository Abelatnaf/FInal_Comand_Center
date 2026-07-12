-- log_audit_change is a trigger function only -- Postgres invokes trigger
-- functions internally regardless of grants, so revoking direct RPC access
-- (same pattern as handle_new_user/post_due_recurring_bills) closes the
-- anon/authenticated-callable RPC surface the advisor flagged without
-- affecting the triggers themselves.
revoke execute on function public.log_audit_change() from public, anon, authenticated;

-- Cheap pre-existing gap the advisor also surfaced: cover this FK for join performance.
create index if not exists transaction_splits_category_id_idx on public.transaction_splits (category_id);
