create schema if not exists private;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'app_role'
  ) then
    create type public.app_role as enum ('user', 'superadmin');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'account_status'
  ) then
    create type public.account_status as enum ('active', 'archived');
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'user',
  status public.account_status not null default 'active',
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_email_length check (char_length(email) <= 320),
  constraint profiles_full_name_length check (char_length(full_name) <= 120)
);

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

create index if not exists profiles_role_status_idx
  on public.profiles (role, status, created_at desc);

create or replace function public.touch_profiles_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function private.is_active_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'superadmin'
      and status = 'active'
  );
$$;

create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  bootstrap_role public.app_role;
begin
  bootstrap_role := case
    when exists (
      select 1
      from public.profiles
      where role = 'superadmin'
        and status = 'active'
    ) then 'user'::public.app_role
    else 'superadmin'::public.app_role
  end;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    status,
    archived_at,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    bootstrap_role,
    'active'::public.account_status,
    null,
    coalesce(new.created_at, timezone('utc', now())),
    timezone('utc', now())
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = case
        when excluded.full_name <> '' then excluded.full_name
        else public.profiles.full_name
      end;

  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.touch_profiles_updated_at();

drop trigger if exists on_auth_user_profile_sync on auth.users;
create trigger on_auth_user_profile_sync
after insert or update of email, raw_user_meta_data on auth.users
for each row
execute function public.sync_profile_from_auth_user();

do $$
begin
  if not exists (select 1 from public.profiles) then
    insert into public.profiles (
      id,
      email,
      full_name,
      role,
      status,
      archived_at,
      created_at,
      updated_at
    )
    select
      users.id,
      coalesce(users.email, ''),
      coalesce(users.raw_user_meta_data ->> 'full_name', ''),
      'superadmin'::public.app_role,
      'active'::public.account_status,
      null,
      coalesce(users.created_at, timezone('utc', now())),
      timezone('utc', now())
    from auth.users as users
    on conflict (id) do nothing;
  else
    insert into public.profiles (
      id,
      email,
      full_name,
      role,
      status,
      archived_at,
      created_at,
      updated_at
    )
    select
      users.id,
      coalesce(users.email, ''),
      coalesce(users.raw_user_meta_data ->> 'full_name', ''),
      'user'::public.app_role,
      'active'::public.account_status,
      null,
      coalesce(users.created_at, timezone('utc', now())),
      timezone('utc', now())
    from auth.users as users
    where not exists (
      select 1
      from public.profiles
      where id = users.id
    )
    on conflict (id) do nothing;
  end if;
end
$$;

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Superadmins can read all profiles" on public.profiles;
create policy "Superadmins can read all profiles"
on public.profiles
for select
to authenticated
using ((select private.is_active_superadmin()));

revoke all on schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.is_active_superadmin() to authenticated;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant usage on type public.app_role to authenticated;
grant usage on type public.account_status to authenticated;
