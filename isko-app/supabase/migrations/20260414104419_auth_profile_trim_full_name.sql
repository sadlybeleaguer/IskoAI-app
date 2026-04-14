create or replace function public.sync_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  bootstrap_role public.app_role;
  trimmed_full_name text;
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

  trimmed_full_name := left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120);

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
    trimmed_full_name,
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
