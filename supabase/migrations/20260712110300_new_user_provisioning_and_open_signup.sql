-- ============================================================
-- Multi-tenant conversion, part 4: auto-provision a new user's
-- default data on signup, and remove the single-account signup
-- gate now that RLS makes multi-user safe.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.settings (user_id, fx_rate, tracking_start_date)
  values (new.id, 1, current_date);

  insert into public.accounts (user_id, name, starting_balance, sort_order) values
    (new.id, 'Checking', 0, 1),
    (new.id, 'Savings', 0, 2),
    (new.id, 'Cash', 0, 3);

  insert into public.categories (user_id, name, monthly_budget, sort_order) values
    (new.id, 'Housing', 0, 1),
    (new.id, 'Food & Dining', 0, 2),
    (new.id, 'Transportation', 0, 3),
    (new.id, 'Personal Care', 0, 4),
    (new.id, 'Entertainment', 0, 5),
    (new.id, 'Shopping', 0, 6),
    (new.id, 'Health & Medical', 0, 7),
    (new.id, 'Subscriptions', 0, 8),
    (new.id, 'Travel', 0, 9),
    (new.id, 'Other', 0, 10);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---- signup is now open to anyone; drop the single-account gate ----
drop function if exists public.can_create_first_account();

-- Trigger-only function; Postgres invokes it internally on auth.users insert
-- regardless of EXECUTE grants, so revoking direct RPC callability is safe.
-- Matches the same pattern already applied to set_computed_fields().
revoke execute on function public.handle_new_user() from public, anon, authenticated;

notify pgrst, 'reload schema';
