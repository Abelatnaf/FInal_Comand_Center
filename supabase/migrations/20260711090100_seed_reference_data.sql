insert into public.settings (id, fx_rate, matriculation_date, starting_sofi, starting_ally, starting_cash)
values (1, 180, '2026-08-15', 0, 0, 0);

insert into public.categories (name, monthly_budget, sort_order) values
  ('Mess Hall/Dining', 0, 1),
  ('Uniform/Gear/Laundry', 0, 2),
  ('Personal Care', 0, 3),
  ('Weekend/Leave/Travel', 0, 4),
  ('Academic/Books', 0, 5),
  ('Transportation', 0, 6),
  ('Health/Medical', 0, 7),
  ('Tech & Subscriptions', 0, 8),
  ('Gifts & Occasions', 0, 9),
  ('Other', 0, 10);

insert into public.semesters (name, start_date, end_date) values
  ('Fall 2026', '2026-08-15', '2026-12-19'),
  ('Spring 2027', '2027-01-12', '2027-05-15');

insert into public.recurring_bills (name, category_id, monthly_cost_usd, billing_day, payment_method, active)
values (
  'Claude',
  (select id from public.categories where name = 'Tech & Subscriptions'),
  20,
  10,
  'SoFi Debit',
  true
);

insert into public.net_worth_snapshots (snapshot_date, sofi_actual, ally_actual, cash_actual, notes)
values ('2026-08-15', 0, 0, 0, 'Day-1 baseline — auto-linked to Settings, keep this row');

insert into public.key_dates (event, window_label, status, budget_note, sort_order) values
  ('Matriculation Day', 'Aug 15, 2026', 'Confirmed', 'Day 1 — gear/uniform spend spikes here.', 1),
  ('New Cadet (Rat) Orientation', 'Aug 15 – early Sep 2026', 'Confirmed window', 'Limited privileges/leave; spend is mostly PX/gear.', 2),
  ('Academic Convocation', 'Early Sep 2026', 'Estimated', 'No major spend impact.', 3),
  ('Thanksgiving Furlough', 'Late Nov 2026', 'Estimated', 'Travel spend spike if you go home or off-post.', 4),
  ('Fall Exams / Courses End', 'Mid-Dec 2026', 'Estimated', 'Low discretionary spend, high focus.', 5),
  ('Winter Furlough', 'Mid-Dec 2026 – early Jan 2027', 'Estimated', 'Largest travel-spend window of the year.', 6),
  ('Spring Semester Begins', 'Mid-Jan 2027', 'Estimated', 'Budget resets — review Semester Planner.', 7),
  ('Spring Furlough', 'Mar 2027', 'Estimated', 'Travel spend spike.', 8),
  ('Spring Exams / Semester Ends', 'Early–mid May 2027', 'Estimated', 'Low discretionary spend.', 9),
  ('New Market Day', 'May 15', 'Confirmed (annual VMI tradition)', 'Ceremonial — minor spend.', 10);
