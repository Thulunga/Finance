-- Robust group detail loading: one SECURITY DEFINER function returns every
-- expense linked to a group (with its split rows) after verifying membership.
-- Avoids the fragile cross-table RLS between expenses/split_receivables/members.
create or replace function public.list_group_expenses(target_group_id uuid)
returns table (
  split_id uuid,
  expense_id uuid,
  friend_name text,
  amount_owed numeric,
  is_settled boolean,
  settled_date date,
  created_at timestamptz,
  expense_date date,
  description text,
  total_amount numeric,
  category text,
  my_share numeric,
  owner_id uuid
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not exists (
    select 1 from public.expense_group_members
    where group_id = target_group_id and user_id = auth.uid()
  ) then
    raise exception 'You are not a member of this group';
  end if;

  return query
    select
      s.id,
      s.expense_id,
      s.friend_name,
      s.amount_owed,
      s.is_settled,
      s.settled_date,
      s.created_at,
      e.date,
      e.description,
      e.total_amount,
      e.category,
      e.my_share,
      e.user_id
    from public.split_receivables s
    join public.expenses e on e.id = s.expense_id
    where s.group_id = target_group_id
    order by s.created_at desc;
end;
$$;

grant execute on function public.list_group_expenses(uuid) to authenticated;
