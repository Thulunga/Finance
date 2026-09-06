create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  constraint categories_user_name_key unique (user_id, name)
);

alter table public.budgets add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.expenses add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.budgets drop constraint if exists budgets_category_month_year_key;
create unique index if not exists budgets_user_category_month_year_key
  on public.budgets (user_id, category, month_year);

create index if not exists categories_user_id_idx on public.categories (user_id);
create index if not exists budgets_user_id_month_year_idx on public.budgets (user_id, month_year);
create index if not exists expenses_user_id_date_desc_idx on public.expenses (user_id, date desc);

alter table public.categories enable row level security;

drop policy if exists "Allow personal phase access to budgets" on public.budgets;
drop policy if exists "Allow personal phase access to expenses" on public.expenses;
drop policy if exists "Allow personal phase access to split receivables" on public.split_receivables;

create policy "Users can access their own budgets"
  on public.budgets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can access their own expenses"
  on public.expenses
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can access their own receivables"
  on public.split_receivables
  for all to authenticated
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = split_receivables.expense_id
        and expenses.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.expenses
      where expenses.id = split_receivables.expense_id
        and expenses.user_id = auth.uid()
    )
  );

create policy "Users can access their own categories"
  on public.categories
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());