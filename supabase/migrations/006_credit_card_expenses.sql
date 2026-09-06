alter table public.expenses
  add column if not exists is_credit_card boolean not null default false;