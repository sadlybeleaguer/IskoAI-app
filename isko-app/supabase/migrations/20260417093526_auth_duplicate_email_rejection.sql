create or replace function public.is_email_in_use(
  input_email text,
  excluded_user_id uuid default null
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when trim(coalesce(input_email, '')) = '' then false
    else exists (
      select 1
      from public.profiles
      where lower(email) = lower(trim(input_email))
        and (
          excluded_user_id is null
          or id <> excluded_user_id
        )
    )
  end;
$$;

create or replace function public.reject_duplicate_email_signups(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  normalized_email text;
begin
  normalized_email := lower(trim(coalesce(event -> 'user' ->> 'email', '')));

  if normalized_email = '' then
    return '{}'::jsonb;
  end if;

  if public.is_email_in_use(normalized_email) then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code',
        409,
        'message',
        'Email is already in use.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant usage on schema public to service_role;

grant execute
  on function public.is_email_in_use(text, uuid)
  to supabase_auth_admin;

grant execute
  on function public.is_email_in_use(text, uuid)
  to service_role;

grant execute
  on function public.reject_duplicate_email_signups(jsonb)
  to supabase_auth_admin;

revoke execute
  on function public.is_email_in_use(text, uuid)
  from authenticated, anon, public;

revoke execute
  on function public.reject_duplicate_email_signups(jsonb)
  from authenticated, anon, public;

grant select on table public.profiles to supabase_auth_admin;

drop policy if exists "Auth admin can read profiles for auth hooks"
on public.profiles;

create policy "Auth admin can read profiles for auth hooks"
on public.profiles
for select
to supabase_auth_admin
using (true);
