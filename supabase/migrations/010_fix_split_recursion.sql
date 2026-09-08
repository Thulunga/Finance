-- Fixes "infinite recursion detected in policy for relation split_receivables":
-- the expenses<->split_receivables select policies each queried the other RLS-protected
-- table directly. Route the cross-table check through a SECURITY DEFINER function so the
-- inner lookup bypasses RLS instead of re-entering it.

create or replace function public.is_friend_of_expense(target_expense_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.split_receivables
    where expense_id = target_expense_id and friend_user_id = auth.uid()
  );
$$;

grant execute on function public.is_friend_of_expense(uuid) to authenticated;

drop policy if exists "Friends can view expenses they are split into" on public.expenses;

create policy "Friends can view expenses they are split into"
  on public.expenses for select to authenticated
  using (public.is_friend_of_expense(expenses.id));

-- Also fixes create_group_invite: pgcrypto's gen_random_bytes lives in the "extensions"
-- schema, but this function's search_path only included "public".
create or replace function public.create_group_invite(target_group_id uuid, expires_in_hours integer default 168)
returns public.expense_group_invites
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller uuid := auth.uid();
  new_invite public.expense_group_invites;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.expense_group_members
    where group_id = target_group_id and user_id = caller
  ) then
    raise exception 'You are not a member of this group';
  end if;

  insert into public.expense_group_invites (group_id, token, created_by, expires_at)
  values (
    target_group_id,
    encode(gen_random_bytes(12), 'hex'),
    caller,
    case when expires_in_hours is null then null else now() + (expires_in_hours || ' hours')::interval end
  )
  returning * into new_invite;

  return new_invite;
end;
$$;

grant execute on function public.create_group_invite(uuid, integer) to authenticated;
