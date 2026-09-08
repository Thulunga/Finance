-- Avoid recursive RLS checks when a policy needs to know whether the caller
-- belongs to a group. The helper runs with the function owner's privileges.
create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.expense_group_members
    where group_id = target_group_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;

drop policy if exists "Members can view their groups" on public.expense_groups;
create policy "Members can view their groups"
  on public.expense_groups for select to authenticated
  using (public.is_group_member(expense_groups.id));

drop policy if exists "Members can view group rosters" on public.expense_group_members;
create policy "Members can view group rosters"
  on public.expense_group_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_group_member(expense_group_members.group_id)
  );

drop policy if exists "Members can view group invites" on public.expense_group_invites;
create policy "Members can view group invites"
  on public.expense_group_invites for select to authenticated
  using (public.is_group_member(expense_group_invites.group_id));

drop policy if exists "Group members can view group splits" on public.split_receivables;
create policy "Group members can view group splits"
  on public.split_receivables for select to authenticated
  using (public.is_group_member(split_receivables.group_id));