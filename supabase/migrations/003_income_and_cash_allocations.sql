create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  month_year text not null,
  created_at timestamptz default now()
);

create table if not exists public.cash_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_year text not null,
  allocation_type text not null check (allocation_type in ('investment', 'emergency_fund')),
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz default now()
);

create index if not exists income_entries_user_month_idx
  on public.income_entries (user_id, month_year, date desc);
create index if not exists cash_allocations_user_month_idx
  on public.cash_allocations (user_id, month_year, allocation_type);

alter table public.income_entries enable row level security;
alter table public.cash_allocations enable row level security;

create policy "Users can access their own income"
  on public.income_entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can access their own cash allocations"
  on public.cash_allocations
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());