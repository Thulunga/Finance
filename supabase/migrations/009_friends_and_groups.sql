-- Friends, expense groups, invite links, and friend-linked splits.

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (user_id <> friend_id),
  constraint friendships_unique unique (user_id, friend_id)
);

create index if not exists friendships_user_id_idx on public.friendships (user_id);

create table if not exists public.expense_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.expense_group_members (
  group_id uuid not null references public.expense_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists expense_group_members_user_id_idx on public.expense_group_members (user_id);

create table if not exists public.expense_group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.expense_groups(id) on delete cascade,
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked boolean not null default false
);

create index if not exists expense_group_invites_group_id_idx on public.expense_group_invites (group_id);

-- Link splits to a real account and (optionally) the group they belong to.
alter table public.split_receivables add column if not exists friend_user_id uuid references auth.users(id) on delete set null;
alter table public.split_receivables add column if not exists group_id uuid references public.expense_groups(id) on delete set null;

create index if not exists split_receivables_friend_user_id_idx on public.split_receivables (friend_user_id);

create table if not exists public.split_settlement_history (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.split_receivables(id) on delete cascade,
  action text not null check (action in ('settled', 'unsettled')),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists split_settlement_history_split_id_idx on public.split_settlement_history (split_id);

alter table public.friendships enable row level security;
alter table public.expense_groups enable row level security;
alter table public.expense_group_members enable row level security;
alter table public.expense_group_invites enable row level security;
alter table public.split_settlement_history enable row level security;

-- All writes to friendships/groups/members/invites go through the security-definer
-- functions below, so only select policies are granted directly to authenticated users.
create policy "Users can view their own friendships"
  on public.friendships for select to authenticated
  using (user_id = auth.uid());

create policy "Members can view their groups"
  on public.expense_groups for select to authenticated
  using (
    exists (
      select 1 from public.expense_group_members m
      where m.group_id = expense_groups.id and m.user_id = auth.uid()
    )
  );

create policy "Members can view group rosters"
  on public.expense_group_members for select to authenticated
  using (
    user_id = auth.uid()
    or group_id in (
      select group_id from public.expense_group_members where user_id = auth.uid()
    )
  );

create policy "Members can view group invites"
  on public.expense_group_invites for select to authenticated
  using (
    exists (
      select 1 from public.expense_group_members m
      where m.group_id = expense_group_invites.group_id and m.user_id = auth.uid()
    )
  );

create policy "Participants can view settlement history"
  on public.split_settlement_history for select to authenticated
  using (
    actor_user_id = auth.uid()
    or exists (
      select 1 from public.split_receivables s
      join public.expenses e on e.id = s.expense_id
      where s.id = split_settlement_history.split_id
        and (e.user_id = auth.uid() or s.friend_user_id = auth.uid())
    )
  );

create policy "Participants can log settlement history"
  on public.split_settlement_history for insert to authenticated
  with check (actor_user_id = auth.uid());

-- Broaden split_receivables so the assigned friend can see (but not silently edit) their splits.
drop policy if exists "Users can access their own receivables" on public.split_receivables;

create policy "Owners manage their receivables"
  on public.split_receivables for all to authenticated
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = split_receivables.expense_id and expenses.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.expenses
      where expenses.id = split_receivables.expense_id and expenses.user_id = auth.uid()
    )
  );

create policy "Friends can view their assigned receivables"
  on public.split_receivables for select to authenticated
  using (friend_user_id = auth.uid());

-- Lets a friend see the expense details (date/description/total) for splits assigned to them.
create policy "Friends can view expenses they are split into"
  on public.expenses for select to authenticated
  using (
    exists (
      select 1 from public.split_receivables s
      where s.expense_id = expenses.id and s.friend_user_id = auth.uid()
    )
  );

-- Adds a two-way friendship using the target user's 5-character profile code.
create or replace function public.add_friend_by_code(target_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  target_user uuid;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  select user_id into target_user from public.profiles where user_code = upper(trim(target_code));

  if target_user is null then
    raise exception 'No user found with that code';
  end if;

  if target_user = caller then
    raise exception 'You cannot add yourself as a friend';
  end if;

  insert into public.friendships (user_id, friend_id) values (caller, target_user)
    on conflict (user_id, friend_id) do nothing;
  insert into public.friendships (user_id, friend_id) values (target_user, caller)
    on conflict (user_id, friend_id) do nothing;
end;
$$;

grant execute on function public.add_friend_by_code(text) to authenticated;

create or replace function public.create_expense_group(group_name text)
returns public.expense_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  new_group public.expense_groups;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  if trim(group_name) = '' then
    raise exception 'Group name is required';
  end if;

  insert into public.expense_groups (name, created_by)
  values (trim(group_name), caller)
  returning * into new_group;

  insert into public.expense_group_members (group_id, user_id)
  values (new_group.id, caller);

  return new_group;
end;
$$;

grant execute on function public.create_expense_group(text) to authenticated;

-- Lets an existing member add someone directly using their profile code (also becomes a friend).
create or replace function public.add_group_member_by_code(target_group_id uuid, target_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  target_user uuid;
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

  select user_id into target_user from public.profiles where user_code = upper(trim(target_code));

  if target_user is null then
    raise exception 'No user found with that code';
  end if;

  insert into public.expense_group_members (group_id, user_id)
  values (target_group_id, target_user)
  on conflict (group_id, user_id) do nothing;

  insert into public.friendships (user_id, friend_id) values (caller, target_user)
    on conflict (user_id, friend_id) do nothing;
  insert into public.friendships (user_id, friend_id) values (target_user, caller)
    on conflict (user_id, friend_id) do nothing;
end;
$$;

grant execute on function public.add_group_member_by_code(uuid, text) to authenticated;

create or replace function public.create_group_invite(target_group_id uuid, expires_in_hours integer default 168)
returns public.expense_group_invites
language plpgsql
security definer
set search_path = public
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

create or replace function public.revoke_group_invite(target_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  update public.expense_group_invites
  set revoked = true
  where id = target_invite_id
    and group_id in (
      select group_id from public.expense_group_members where user_id = caller
    );
end;
$$;

grant execute on function public.revoke_group_invite(uuid) to authenticated;

-- Redeems an invite link/token: joins the group and connects inviter + joiner as friends.
create or replace function public.join_group_via_token(invite_token text)
returns public.expense_groups
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  invite public.expense_group_invites;
  joined_group public.expense_groups;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  select * into invite from public.expense_group_invites
    where token = invite_token
      and revoked = false
      and (expires_at is null or expires_at > now());

  if invite is null then
    raise exception 'This invite link is invalid or has expired';
  end if;

  insert into public.expense_group_members (group_id, user_id)
  values (invite.group_id, caller)
  on conflict (group_id, user_id) do nothing;

  insert into public.friendships (user_id, friend_id) values (invite.created_by, caller)
    on conflict (user_id, friend_id) do nothing;
  insert into public.friendships (user_id, friend_id) values (caller, invite.created_by)
    on conflict (user_id, friend_id) do nothing;

  select * into joined_group from public.expense_groups where id = invite.group_id;
  return joined_group;
end;
$$;

grant execute on function public.join_group_via_token(text) to authenticated;

-- Lets the assigned friend mark their own split as paid/unpaid, with a logged history entry.
create or replace function public.settle_split_as_friend(target_split_id uuid, mark_settled boolean)
returns public.split_receivables
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  updated public.split_receivables;
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  update public.split_receivables
  set is_settled = mark_settled,
      settled_date = case when mark_settled then current_date else null end
  where id = target_split_id and friend_user_id = caller
  returning * into updated;

  if updated is null then
    raise exception 'Split not found or you are not the assigned friend';
  end if;

  insert into public.split_settlement_history (split_id, action, actor_user_id)
  values (target_split_id, case when mark_settled then 'settled' else 'unsettled' end, caller);

  return updated;
end;
$$;

grant execute on function public.settle_split_as_friend(uuid, boolean) to authenticated;

create or replace function public.list_my_friends()
returns table (user_id uuid, user_code text, avatar_path text)
language sql
security definer
set search_path = public
stable
as $$
  select f.friend_id, p.user_code, p.avatar_path
  from public.friendships f
  join public.profiles p on p.user_id = f.friend_id
  where f.user_id = auth.uid();
$$;

grant execute on function public.list_my_friends() to authenticated;

create or replace function public.list_my_groups()
returns table (group_id uuid, group_name text, member_count bigint, is_owner boolean, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select g.id, g.name, (select count(*) from public.expense_group_members m2 where m2.group_id = g.id), g.created_by = auth.uid(), g.created_at
  from public.expense_groups g
  join public.expense_group_members m on m.group_id = g.id and m.user_id = auth.uid();
$$;

grant execute on function public.list_my_groups() to authenticated;

create or replace function public.list_group_members(target_group_id uuid)
returns table (user_id uuid, user_code text, avatar_path text, joined_at timestamptz)
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
    select m.user_id, p.user_code, p.avatar_path, m.joined_at
    from public.expense_group_members m
    join public.profiles p on p.user_id = m.user_id
    where m.group_id = target_group_id;
end;
$$;

grant execute on function public.list_group_members(uuid) to authenticated;
