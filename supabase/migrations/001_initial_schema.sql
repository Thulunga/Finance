create extension if not exists pgcrypto with schema extensions;

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  allocated_amount numeric(12, 2) not null default 0,
  month_year text not null,
  created_at timestamptz default now(),
  constraint budgets_category_month_year_key unique (category, month_year)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  description text not null,
  total_amount numeric(12, 2) not null,
  category text not null,
  is_shared boolean not null default false,
  my_share numeric(12, 2) not null,
  created_at timestamptz default now()
);

create table if not exists public.split_receivables (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses(id) on delete cascade,
  friend_name text not null,
  amount_owed numeric(12, 2) not null,
  is_settled boolean not null default false,
  settled_date date,
  created_at timestamptz default now()
);

create index if not exists budgets_month_year_idx
  on public.budgets (month_year);

create index if not exists expenses_date_desc_idx
  on public.expenses (date desc);

create index if not exists expenses_category_idx
  on public.expenses (category);

create index if not exists split_receivables_expense_id_idx
  on public.split_receivables (expense_id);

create index if not exists split_receivables_friend_name_is_settled_idx
  on public.split_receivables (friend_name, is_settled);

alter table public.budgets enable row level security;
alter table public.expenses enable row level security;
alter table public.split_receivables enable row level security;

create policy "Allow personal phase access to budgets"
  on public.budgets
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "Allow personal phase access to expenses"
  on public.expenses
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "Allow personal phase access to split receivables"
  on public.split_receivables
  for all
  to anon, authenticated
  using (true)
  with check (true);