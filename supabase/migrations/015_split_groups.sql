-- Generic, shareable, passcode-protected split groups.
--
-- Any visitor (anon or authenticated) can create a group, add free-text members,
-- and share a unique slug URL. An optional 4-digit passcode acts like a login
-- gate for the page. Unlike the old open trip tables (migration 014), these
-- tables are locked down: RLS is enabled with NO direct grants, so the anon key
-- cannot read or write rows directly. ALL access goes through SECURITY DEFINER
-- RPCs that verify the passcode server-side, which is what makes the passcode
-- meaningful (a leaked anon key still can't bypass it).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.split_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  currency text not null default 'INR',
  passcode_hash text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.split_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.split_groups (id) on delete cascade,
  name text not null,
  friend_user_id uuid references auth.users (id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.split_group_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.split_groups (id) on delete cascade,
  description text not null,
  total_amount numeric(12, 2) not null check (total_amount > 0),
  paid_by text not null,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.split_group_expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.split_group_expenses (id) on delete cascade,
  person text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.split_group_settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.split_groups (id) on delete cascade,
  from_person text not null,
  to_person text not null,
  amount numeric(12, 2) not null check (amount > 0),
  settled_date date not null default current_date,
  created_at timestamptz not null default now(),
  constraint split_group_settlements_distinct check (from_person <> to_person)
);

create index if not exists split_group_members_group_id_idx
  on public.split_group_members (group_id);
create index if not exists split_group_expenses_group_id_idx
  on public.split_group_expenses (group_id);
create index if not exists split_group_expense_splits_expense_id_idx
  on public.split_group_expense_splits (expense_id);
create index if not exists split_group_settlements_group_id_idx
  on public.split_group_settlements (group_id);

-- RLS on, no policies: direct access via the anon/authenticated roles is denied.
-- The SECURITY DEFINER functions below run as the table owner and bypass RLS.
alter table public.split_groups enable row level security;
alter table public.split_group_members enable row level security;
alter table public.split_group_expenses enable row level security;
alter table public.split_group_expense_splits enable row level security;
alter table public.split_group_settlements enable row level security;

-- Generate a short, URL-safe, collision-free slug.
create or replace function public.__gen_split_slug()
returns text
language plpgsql
as $$
declare
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text;
  i int;
begin
  loop
    result := '';
    for i in 1..8 loop
      result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.split_groups where slug = result);
  end loop;
  return result;
end;
$$;

-- Resolve a slug to its group id, enforcing the passcode when one is set.
create or replace function public.__resolve_split_group(p_slug text, p_passcode text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_hash text;
begin
  select id, passcode_hash into v_id, v_hash
  from public.split_groups
  where slug = p_slug;

  if v_id is null then
    raise exception 'GROUP_NOT_FOUND';
  end if;

  if v_hash is not null then
    if p_passcode is null or crypt(p_passcode, v_hash) <> v_hash then
      raise exception 'INVALID_PASSCODE';
    end if;
  end if;

  return v_id;
end;
$$;

create or replace function public.create_split_group(
  p_name text,
  p_currency text,
  p_passcode text,
  p_members text[]
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_slug text;
  v_id uuid;
  v_name text := nullif(btrim(p_name), '');
  v_currency text := coalesce(nullif(btrim(p_currency), ''), 'INR');
  v_pass text := nullif(btrim(p_passcode), '');
  m text;
  v_idx int := 0;
begin
  if v_name is null then
    raise exception 'Group name is required';
  end if;
  if v_pass is not null and v_pass !~ '^\d{4}$' then
    raise exception 'Passcode must be 4 digits';
  end if;

  v_slug := public.__gen_split_slug();

  insert into public.split_groups (slug, name, currency, passcode_hash, created_by)
  values (
    v_slug,
    v_name,
    v_currency,
    case when v_pass is null then null else crypt(v_pass, gen_salt('bf')) end,
    auth.uid()
  )
  returning id into v_id;

  if p_members is not null then
    foreach m in array p_members loop
      if nullif(btrim(m), '') is not null then
        insert into public.split_group_members (group_id, name, sort_order)
        values (v_id, btrim(m), v_idx);
        v_idx := v_idx + 1;
      end if;
    end loop;
  end if;

  return v_slug;
end;
$$;

-- Public metadata used to render the passcode gate without leaking any data.
create or replace function public.split_group_meta(p_slug text)
returns table (name text, currency text, has_passcode boolean)
language sql
security definer
set search_path = public, extensions
as $$
  select name, currency, passcode_hash is not null
  from public.split_groups
  where slug = p_slug;
$$;

create or replace function public.get_split_group(p_slug text, p_passcode text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_result jsonb;
begin
  v_id := public.__resolve_split_group(p_slug, p_passcode);

  select jsonb_build_object(
    'group', (
      select jsonb_build_object(
        'slug', slug,
        'name', name,
        'currency', currency,
        'has_passcode', passcode_hash is not null
      )
      from public.split_groups where id = v_id
    ),
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', id, 'name', name)
        order by sort_order, created_at
      )
      from public.split_group_members where group_id = v_id
    ), '[]'::jsonb),
    'expenses', coalesce((
      select jsonb_agg(item order by e_date desc, e_created desc)
      from (
        select
          jsonb_build_object(
            'id', ex.id,
            'description', ex.description,
            'total_amount', ex.total_amount,
            'paid_by', ex.paid_by,
            'expense_date', ex.expense_date,
            'created_at', ex.created_at,
            'splits', coalesce((
              select jsonb_agg(jsonb_build_object('person', s.person, 'amount', s.amount))
              from public.split_group_expense_splits s where s.expense_id = ex.id
            ), '[]'::jsonb)
          ) as item,
          ex.expense_date as e_date,
          ex.created_at as e_created
        from public.split_group_expenses ex
        where ex.group_id = v_id
      ) rows
    ), '[]'::jsonb),
    'settlements', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'from_person', from_person,
          'to_person', to_person,
          'amount', amount,
          'settled_date', settled_date,
          'created_at', created_at
        )
        order by settled_date desc, created_at desc
      )
      from public.split_group_settlements where group_id = v_id
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

create or replace function public.add_split_group_member(
  p_slug text,
  p_passcode text,
  p_name text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_name text := nullif(btrim(p_name), '');
  v_next int;
begin
  v_id := public.__resolve_split_group(p_slug, p_passcode);
  if v_name is null then
    raise exception 'Name is required';
  end if;
  if exists (
    select 1 from public.split_group_members
    where group_id = v_id and lower(name) = lower(v_name)
  ) then
    raise exception 'That name is already in the group';
  end if;
  select coalesce(max(sort_order) + 1, 0) into v_next
  from public.split_group_members where group_id = v_id;
  insert into public.split_group_members (group_id, name, sort_order)
  values (v_id, v_name, v_next);
end;
$$;

create or replace function public.remove_split_group_member(
  p_slug text,
  p_passcode text,
  p_member_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_name text;
begin
  v_id := public.__resolve_split_group(p_slug, p_passcode);
  select name into v_name
  from public.split_group_members
  where id = p_member_id and group_id = v_id;
  if v_name is null then
    return;
  end if;
  if exists (
    select 1 from public.split_group_expenses
    where group_id = v_id and paid_by = v_name
  ) or exists (
    select 1 from public.split_group_expense_splits s
    join public.split_group_expenses e on e.id = s.expense_id
    where e.group_id = v_id and s.person = v_name
  ) then
    raise exception 'Cannot remove a member who is part of an expense';
  end if;
  delete from public.split_group_members where id = p_member_id and group_id = v_id;
end;
$$;

create or replace function public.add_split_group_expense(
  p_slug text,
  p_passcode text,
  p_description text,
  p_total numeric,
  p_paid_by text,
  p_date date,
  p_splits jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_eid uuid;
  v_desc text := nullif(btrim(p_description), '');
  v_paid_by text := nullif(btrim(p_paid_by), '');
  v_split_total numeric := 0;
  rec record;
begin
  v_id := public.__resolve_split_group(p_slug, p_passcode);

  if v_desc is null then
    raise exception 'Description is required';
  end if;
  if p_total is null or p_total <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;
  if v_paid_by is null then
    raise exception 'Payer is required';
  end if;

  insert into public.split_group_expenses (group_id, description, total_amount, paid_by, expense_date)
  values (v_id, v_desc, p_total, v_paid_by, coalesce(p_date, current_date))
  returning id into v_eid;

  for rec in
    select * from jsonb_to_recordset(coalesce(p_splits, '[]'::jsonb)) as x(person text, amount numeric)
  loop
    if rec.amount is not null and rec.amount > 0 then
      insert into public.split_group_expense_splits (expense_id, person, amount)
      values (v_eid, rec.person, round(rec.amount, 2));
      v_split_total := v_split_total + round(rec.amount, 2);
    end if;
  end loop;

  if abs(v_split_total - p_total) > 0.01 then
    raise exception 'Split shares must add up to the total amount';
  end if;

  return v_eid;
end;
$$;

create or replace function public.delete_split_group_expense(
  p_slug text,
  p_passcode text,
  p_expense_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  v_id := public.__resolve_split_group(p_slug, p_passcode);
  delete from public.split_group_expenses
  where id = p_expense_id and group_id = v_id;
end;
$$;

create or replace function public.add_split_group_settlement(
  p_slug text,
  p_passcode text,
  p_from text,
  p_to text,
  p_amount numeric,
  p_date date
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_from text := nullif(btrim(p_from), '');
  v_to text := nullif(btrim(p_to), '');
begin
  v_id := public.__resolve_split_group(p_slug, p_passcode);
  if v_from is null or v_to is null then
    raise exception 'Payer and receiver are required';
  end if;
  if v_from = v_to then
    raise exception 'Payer and receiver must be different';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;
  insert into public.split_group_settlements (group_id, from_person, to_person, amount, settled_date)
  values (v_id, v_from, v_to, round(p_amount, 2), coalesce(p_date, current_date));
end;
$$;

create or replace function public.delete_split_group_settlement(
  p_slug text,
  p_passcode text,
  p_settlement_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
begin
  v_id := public.__resolve_split_group(p_slug, p_passcode);
  delete from public.split_group_settlements
  where id = p_settlement_id and group_id = v_id;
end;
$$;

-- Only the RPCs are callable; the tables themselves stay locked.
revoke all on function public.create_split_group(text, text, text, text[]) from public;
revoke all on function public.split_group_meta(text) from public;
revoke all on function public.get_split_group(text, text) from public;
revoke all on function public.add_split_group_member(text, text, text) from public;
revoke all on function public.remove_split_group_member(text, text, uuid) from public;
revoke all on function public.add_split_group_expense(text, text, text, numeric, text, date, jsonb) from public;
revoke all on function public.delete_split_group_expense(text, text, uuid) from public;
revoke all on function public.add_split_group_settlement(text, text, text, text, numeric, date) from public;
revoke all on function public.delete_split_group_settlement(text, text, uuid) from public;

grant execute on function public.create_split_group(text, text, text, text[]) to anon, authenticated;
grant execute on function public.split_group_meta(text) to anon, authenticated;
grant execute on function public.get_split_group(text, text) to anon, authenticated;
grant execute on function public.add_split_group_member(text, text, text) to anon, authenticated;
grant execute on function public.remove_split_group_member(text, text, uuid) to anon, authenticated;
grant execute on function public.add_split_group_expense(text, text, text, numeric, text, date, jsonb) to anon, authenticated;
grant execute on function public.delete_split_group_expense(text, text, uuid) to anon, authenticated;
grant execute on function public.add_split_group_settlement(text, text, text, text, numeric, date) to anon, authenticated;
grant execute on function public.delete_split_group_settlement(text, text, uuid) to anon, authenticated;

-- Migrate the existing Uttarakhand trip (migration 014) into a shareable group
-- with the fixed slug 'uttarakhand'. The old /Tripspendings/tjp URL redirects here.
do $$
declare
  v_gid uuid;
begin
  if not exists (select 1 from public.split_groups where slug = 'uttarakhand') then
    insert into public.split_groups (slug, name, currency, passcode_hash)
    values ('uttarakhand', 'Uttarakhand Diaries', 'INR', null)
    returning id into v_gid;

    insert into public.split_group_members (group_id, name, sort_order)
    values (v_gid, 'Thulunga', 0), (v_gid, 'Jayshree', 1), (v_gid, 'Pragati', 2);

    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'trip_expenses'
    ) then
      insert into public.split_group_expenses (id, group_id, description, total_amount, paid_by, expense_date, created_at)
      select id, v_gid, description, total_amount, paid_by, expense_date, created_at
      from public.trip_expenses;

      insert into public.split_group_expense_splits (expense_id, person, amount, created_at)
      select expense_id, person, amount, created_at
      from public.trip_expense_splits;

      insert into public.split_group_settlements (group_id, from_person, to_person, amount, settled_date, created_at)
      select v_gid, from_person, to_person, amount, settled_date, created_at
      from public.trip_settlements;
    end if;
  end if;
end $$;
