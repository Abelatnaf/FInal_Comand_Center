-- Fixes "permission denied for function assert_owned" on every insert.
--
-- assert_owned is deliberately revoked from anon/authenticated so a client
-- can't call it directly as an ownership oracle. But the trigger functions
-- that call it were SECURITY INVOKER, so they executed as the signed-in user
-- -- who has no EXECUTE on it. The result: every transaction, transfer,
-- recurring expense, savings goal and installment insert failed outright.
--
-- SECURITY DEFINER is the fix rather than granting EXECUTE: the triggers then
-- run as the owner (which can call the helper) while the helper itself stays
-- unreachable from PostgREST. These functions only read a user_id and either
-- raise or set a category, and every lookup inside them is explicitly scoped
-- to new.user_id, so running them as owner grants no extra reach.
--
-- Missed originally because the rollback tests ran as postgres, where
-- assert_owned is executable. Ownership tests have to `set local role
-- authenticated` to mean anything -- see the note in CLAUDE.md section 18.

alter function validate_transaction_refs() security definer;
alter function validate_transfer_refs() security definer;
alter function validate_recurring_expense_refs() security definer;
alter function validate_savings_goal_refs() security definer;
alter function validate_installment_refs() security definer;

-- Postgres fires trigger functions internally regardless of grants, so these
-- revokes only close them off as directly-callable RPCs.
revoke execute on function validate_transaction_refs() from public, anon, authenticated;
revoke execute on function validate_transfer_refs() from public, anon, authenticated;
revoke execute on function validate_recurring_expense_refs() from public, anon, authenticated;
revoke execute on function validate_savings_goal_refs() from public, anon, authenticated;
revoke execute on function validate_installment_refs() from public, anon, authenticated;
