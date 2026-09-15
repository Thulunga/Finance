-- Standalone trip spendings split (Thulunga, Jayshree, Pragati).
-- Intentionally decoupled from auth.users: the page is reachable by obscure URL
-- only, so both anon and authenticated roles get full CRUD. Drop these tables
-- later if the trip feature is no longer needed.

create table if not exists public.trip_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  total_amount numeric(12, 2) not null check (total_amount > 0),
  paid_by text not null,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.trip_expenses(id) on delete cascade,
  person text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists trip_expense_splits_expense_id_idx
  on public.trip_expense_splits (expense_id);

-- Direct payments between members to settle debts (e.g. Jayshree pays Thulunga).
create table if not exists public.trip_settlements (
  id uuid primary key default gen_random_uuid(),
  from_person text not null,
  to_person text not null,
  amount numeric(12, 2) not null check (amount > 0),
  settled_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint trip_settlements_distinct check (from_person <> to_person)
);

alter table public.trip_expenses enable row level security;
alter table public.trip_expense_splits enable row level security;
alter table public.trip_settlements enable row level security;

-- Open policies: anyone who reaches the page (with or without a session) can
-- read and write. Access control is the secrecy of the URL, by design.
drop policy if exists "Trip expenses open access" on public.trip_expenses;
create policy "Trip expenses open access"
  on public.trip_expenses for all
  to anon, authenticated
  using (true) with check (true);

drop policy if exists "Trip splits open access" on public.trip_expense_splits;
create policy "Trip splits open access"
  on public.trip_expense_splits for all
  to anon, authenticated
  using (true) with check (true);

drop policy if exists "Trip settlements open access" on public.trip_settlements;
create policy "Trip settlements open access"
  on public.trip_settlements for all
  to anon, authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.trip_expenses to anon, authenticated;
grant select, insert, update, delete on public.trip_expense_splits to anon, authenticated;
grant select, insert, update, delete on public.trip_settlements to anon, authenticated;

-- Seed the spendings already made on the trip. Idempotent per row: re-running
-- restores any expense that was deleted, and skips ones already present.
-- Temporary helpers keep the rounding logic in one place, then get dropped.
create or replace function public.__seed_trip_equal(
  p_desc text, p_total numeric, p_payer text, p_date date, p_people text[]
) returns void language plpgsql as $$
declare
  eid uuid;
  n int := array_length(p_people, 1);
  total_paise int := round(p_total * 100);
  base int := total_paise / n;
  rem int := total_paise - base * n;
  i int;
begin
  if exists (
    select 1 from public.trip_expenses
    where description = p_desc and total_amount = p_total and paid_by = p_payer
  ) then
    return;
  end if;
  insert into public.trip_expenses (description, total_amount, paid_by, expense_date)
    values (p_desc, p_total, p_payer, p_date) returning id into eid;
  for i in 1..n loop
    insert into public.trip_expense_splits (expense_id, person, amount)
      values (eid, p_people[i], (base + case when i <= rem then 1 else 0 end)::numeric / 100);
  end loop;
end;
$$;

create or replace function public.__seed_trip_custom(
  p_desc text, p_total numeric, p_payer text, p_date date, p_people text[], p_amounts numeric[]
) returns void language plpgsql as $$
declare
  eid uuid;
  i int;
begin
  if exists (
    select 1 from public.trip_expenses
    where description = p_desc and total_amount = p_total and paid_by = p_payer
  ) then
    return;
  end if;
  insert into public.trip_expenses (description, total_amount, paid_by, expense_date)
    values (p_desc, p_total, p_payer, p_date) returning id into eid;
  for i in 1..array_length(p_people, 1) loop
    insert into public.trip_expense_splits (expense_id, person, amount)
      values (eid, p_people[i], p_amounts[i]);
  end loop;
end;
$$;

do $$
declare
  everyone text[] := array['Thulunga', 'Jayshree', 'Pragati'];
  d date := date '2026-09-14';
begin
  -- Jayshree paid
  perform public.__seed_trip_equal('Breakfast', 240, 'Jayshree', d, everyone);
  perform public.__seed_trip_equal('Waterfall ticket', 150, 'Jayshree', d, everyone);
  perform public.__seed_trip_equal('Local toll (Nainital)', 300, 'Jayshree', d, everyone);
  perform public.__seed_trip_equal('Lunch (Nainital)', 795, 'Jayshree', d, everyone);
  perform public.__seed_trip_equal('Stay (Nainital)', 1500, 'Jayshree', d, everyone);
  perform public.__seed_trip_equal('Chai', 80, 'Jayshree', d, everyone);
  perform public.__seed_trip_equal('Prasad & ghanti (Golu Devta)', 300, 'Jayshree', d, everyone);

  -- Pragati paid
  perform public.__seed_trip_equal('Breakfast (Maggie)', 130, 'Pragati', d, everyone);
  perform public.__seed_trip_equal('Dinner', 1228, 'Pragati', d, everyone);
  perform public.__seed_trip_custom('Kashmiri bangles', 400, 'Pragati', d,
    array['Jayshree', 'Pragati'], array[200, 200]::numeric[]);
  perform public.__seed_trip_custom('Shawl (Pragati)', 300, 'Pragati', d,
    array['Pragati'], array[300]::numeric[]);
  perform public.__seed_trip_equal('Coffee', 60, 'Pragati', d, everyone);
  perform public.__seed_trip_equal('Food (Punjab Rasoi)', 1694, 'Pragati', d, everyone);
  perform public.__seed_trip_equal('Almora homestay & food', 2340, 'Pragati', d, everyone);

  -- Thulunga paid
  perform public.__seed_trip_equal('Petrol', 1910, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Petrol', 1199.36, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Petrol', 1170, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Petrol', 1294.58, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Parking', 500, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Water', 40, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Breakfast (Kainchi Dham)', 392, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Evening snacks (Almora Mall Road)', 260, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Parking (Kainchi Dham)', 118, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Boating (Bhimtal)', 300, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Water (Mukteshwar Dham)', 20, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Food (Mukteshwar Dham)', 240, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Fruit salad', 50, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Washroom (Bhimtal)', 30, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Mandir prasad', 100, 'Thulunga', d, everyone);
  perform public.__seed_trip_equal('Toll plaza', 1195, 'Thulunga', d, everyone);
  -- Thulunga paid for Pragati & Jayshree's rain coats (100 each), not for himself.
  perform public.__seed_trip_custom('Rain coats (Pragati & Jayshree)', 200, 'Thulunga', d,
    array['Pragati', 'Jayshree'], array[100, 100]::numeric[]);

  -- Jayshree already paid Thulunga 300 towards her share.
  if not exists (
    select 1 from public.trip_settlements
    where from_person = 'Jayshree' and to_person = 'Thulunga' and amount = 300
  ) then
    insert into public.trip_settlements (from_person, to_person, amount, settled_date)
      values ('Jayshree', 'Thulunga', 300, d);
  end if;
end $$;

drop function if exists public.__seed_trip_equal(text, numeric, text, date, text[]);
drop function if exists public.__seed_trip_custom(text, numeric, text, date, text[], numeric[]);
