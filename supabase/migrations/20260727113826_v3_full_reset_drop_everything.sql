-- v3 rebuild: VMI institutional payment tracker replaces the generic
-- Command Deck v2 ledger app (entries/accounts/categories/savings_goals/
-- settings). Full stop, fresh start, per CLAUDE.md's v3 plan -- "v1/v2 is a
-- reference document, not a starting point." auth.users is untouched by
-- dropping the public schema, so the existing login carries over unchanged.
drop schema public cascade;
create schema public;
grant usage on schema public to public;
grant all on schema public to postgres;
