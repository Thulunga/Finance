alter table public.cash_allocations
  add column if not exists date date;

update public.cash_allocations
set date = coalesce(date, created_at::date, current_date)
where date is null;

alter table public.cash_allocations
  alter column date set default current_date,
  alter column date set not null;