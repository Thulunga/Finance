create table if not exists public.epf_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  balance numeric(12, 2) not null check (balance >= 0),
  recorded_at date not null default current_date,
  note text,
  created_at timestamptz default now()
);

create table if not exists public.fd_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  interest_rate numeric(5, 2),
  maturity_date date,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists epf_balances_user_recorded_idx
  on public.epf_balances (user_id, recorded_at desc, created_at desc);
create index if not exists fd_accounts_user_idx
  on public.fd_accounts (user_id, created_at desc);

alter table public.epf_balances enable row level security;
alter table public.fd_accounts enable row level security;

create policy "Users can access their own epf balances"
  on public.epf_balances
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can access their own fd accounts"
  on public.fd_accounts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
