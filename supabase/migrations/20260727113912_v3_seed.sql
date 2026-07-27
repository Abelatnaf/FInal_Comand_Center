-- Seed the two payers + a starter account set for the existing user.
-- Deliberately NO fx_rates row and NO obligations seeded -- both need real
-- numbers only Abel has, and fabricating either would violate "never lies
-- about money" (plan section 5) and the empty-state design in section 6.
-- Settings prompts him to enter today's real rate before he can log
-- anything; Bills' empty state prompts the first real VMI obligation.
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'abelatnafu1@outlook.com';

  if v_user_id is null then
    raise exception 'Expected user not found -- seed skipped';
  end if;

  insert into public.payers (user_id, key, label, class_year, is_default) values
    (v_user_id, 'self', 'Abel — Class of 2030', 2030, true),
    (v_user_id, 'family', 'Family — Class of 2029', 2029, false);

  insert into public.accounts (user_id, name, currency, kind, opening_balance_minor) values
    (v_user_id, 'CBE', 'ETB', 'bank', 0),
    (v_user_id, 'Cash ETB', 'ETB', 'cash', 0),
    (v_user_id, 'US Checking', 'USD', 'bank', 0),
    (v_user_id, 'Payoneer', 'USD', 'processor', 0);
end $$;
