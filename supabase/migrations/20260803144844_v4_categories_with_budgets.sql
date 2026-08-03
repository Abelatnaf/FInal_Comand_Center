-- v4: real category records, so a category can carry a monthly budget, a
-- colour and an icon. Until now categories were a hardcoded list of 8 text
-- labels in lib/categories.ts and a bare text column on transactions, which
-- left nowhere to hang a budget.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense', 'income')),
  color text not null default 'slate',
  icon text not null default '•',
  -- null = no budget set. Only meaningful for expense categories; the UI
  -- only offers it there, but the column is not kind-restricted so an
  -- income target stays possible later without a migration.
  monthly_budget_minor bigint check (monthly_budget_minor is null or monthly_budget_minor >= 0),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, kind, name)
);

create index categories_user_idx on public.categories (user_id);

alter table public.categories enable row level security;

create policy categories_own on public.categories
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.categories to anon, authenticated, service_role;

-- Seed a general-purpose starter set for every existing user. This app is no
-- longer institution-specific, so these are everyday-spending categories
-- rather than the tuition/uniform set v3 shipped with.
insert into public.categories (user_id, name, kind, color, icon, sort_order)
select u.id, c.name, c.kind, c.color, c.icon, c.sort_order
from auth.users u
cross join (values
  ('Groceries',      'expense', 'emerald', '🛒', 10),
  ('Dining Out',     'expense', 'amber',   '🍔', 20),
  ('Transport',      'expense', 'blue',    '🚗', 30),
  ('Housing',        'expense', 'violet',  '🏠', 40),
  ('Utilities',      'expense', 'cyan',    '💡', 50),
  ('Shopping',       'expense', 'pink',    '🛍️', 60),
  ('Health',         'expense', 'rose',    '💊', 70),
  ('Entertainment',  'expense', 'orange',  '🎬', 80),
  ('Subscriptions',  'expense', 'indigo',  '🔁', 90),
  ('Education',      'expense', 'teal',    '📚', 100),
  ('Travel',         'expense', 'lime',    '✈️', 110),
  ('Personal Care',  'expense', 'pink',    '🧴', 120),
  ('Fees & Charges', 'expense', 'slate',   '🏦', 130),
  ('Other',          'expense', 'slate',   '📦', 999),
  ('Salary',         'income',  'emerald', '💼', 10),
  ('Freelance',      'income',  'blue',    '💻', 20),
  ('Family Support', 'income',  'violet',  '👨‍👩‍👧', 30),
  ('Refund',         'income',  'cyan',    '↩️', 40),
  ('Gift',           'income',  'pink',    '🎁', 50),
  ('Investment',     'income',  'amber',   '📈', 60),
  ('Other',          'income',  'slate',   '📦', 999)
) as c(name, kind, color, icon, sort_order)
on conflict (user_id, kind, name) do nothing;
