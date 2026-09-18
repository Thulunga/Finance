-- Standalone receivables: money others owe the user, tracked independently of
-- expenses. Replaces the old expense-driven split_receivables flow (which is
-- left intact but no longer written to from the app). Users add entries by hand.

create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  receivable_date date not null default current_date,
  is_settled boolean not null default false,
  settled_date date,
  created_at timestamptz not null default now()
);

create index if not exists receivables_user_idx
  on public.receivables (user_id, is_settled, created_at desc);

alter table public.receivables enable row level security;

create policy "Users can access their own receivables"
  on public.receivables
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.receivables to authenticated;
