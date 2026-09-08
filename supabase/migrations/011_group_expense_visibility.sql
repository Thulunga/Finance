-- Let every member inspect all expenses linked to a group, not only their own split.
-- The security-definer helper avoids a recursive expenses <-> split policy check.
create or replace function public.is_member_of_group_expense(target_expense_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.split_receivables s
    join public.expense_group_members m on m.group_id = s.group_id
    where s.expense_id = target_expense_id
      and m.user_id = auth.uid()
  );
$$;

grant execute on function public.is_member_of_group_expense(uuid) to authenticated;

create policy "Group members can view group splits"
  on public.split_receivables for select to authenticated
  using (
    exists (
      select 1
      from public.expense_group_members m
      where m.group_id = split_receivables.group_id
        and m.user_id = auth.uid()
    )
  );

create policy "Group members can view group expenses"
  on public.expenses for select to authenticated
  using (public.is_member_of_group_expense(expenses.id));