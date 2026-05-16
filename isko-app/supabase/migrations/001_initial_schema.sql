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
do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'chat_message_role'
  ) then
    create type public.chat_message_role as enum ('user', 'assistant');
  end if;
end
$$;

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_threads_title_length check (char_length(title) between 1 and 120)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.chat_message_role not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chat_messages_content_length check (char_length(trim(content)) > 0)
);

create index if not exists chat_threads_user_updated_idx
  on public.chat_threads (user_id, updated_at desc);

create index if not exists chat_messages_user_thread_created_idx
  on public.chat_messages (user_id, thread_id, created_at);

create or replace function public.touch_chat_threads_updated_at()
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

create or replace function public.sync_chat_thread_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_threads
  set updated_at = coalesce(new.created_at, timezone('utc', now()))
  where id = new.thread_id;

  return new;
end;
$$;

drop trigger if exists chat_threads_set_updated_at on public.chat_threads;
create trigger chat_threads_set_updated_at
before update on public.chat_threads
for each row
execute function public.touch_chat_threads_updated_at();

drop trigger if exists chat_messages_sync_thread_activity on public.chat_messages;
create trigger chat_messages_sync_thread_activity
after insert on public.chat_messages
for each row
execute function public.sync_chat_thread_activity();

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Users can read own chat threads" on public.chat_threads;
create policy "Users can read own chat threads"
on public.chat_threads
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can create own chat threads" on public.chat_threads;
create policy "Users can create own chat threads"
on public.chat_threads
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update own chat threads" on public.chat_threads;
create policy "Users can update own chat threads"
on public.chat_threads
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can read own chat messages" on public.chat_messages;
create policy "Users can read own chat messages"
on public.chat_messages
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can create own chat messages" on public.chat_messages;
create policy "Users can create own chat messages"
on public.chat_messages
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and exists (
    select 1
    from public.chat_threads
    where id = thread_id
      and user_id = (select auth.uid())
  )
);

revoke all on public.chat_threads from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
grant select, insert, update on public.chat_threads to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant usage on type public.chat_message_role to authenticated;
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
create or replace function public.touch_workspace_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint notes_title_length check (char_length(title) <= 160)
);

create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_all_day boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint calendar_events_title_length check (char_length(title) <= 200),
  constraint calendar_events_time_order check (ends_at >= starts_at)
);

create index if not exists calendar_events_user_starts_idx
  on public.calendar_events (user_id, starts_at asc);

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
before update on public.notes
for each row
execute function public.touch_workspace_updated_at();

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row
execute function public.touch_workspace_updated_at();

alter table public.notes enable row level security;
alter table public.calendar_events enable row level security;

drop policy if exists "Users can read own notes" on public.notes;
create policy "Users can read own notes"
on public.notes
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own notes" on public.notes;
create policy "Users can insert own notes"
on public.notes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes"
on public.notes
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes"
on public.notes
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own calendar events" on public.calendar_events;
create policy "Users can read own calendar events"
on public.calendar_events
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own calendar events" on public.calendar_events;
create policy "Users can insert own calendar events"
on public.calendar_events
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own calendar events" on public.calendar_events;
create policy "Users can update own calendar events"
on public.calendar_events
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own calendar events" on public.calendar_events;
create policy "Users can delete own calendar events"
on public.calendar_events
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.notes from anon, authenticated;
grant select, insert, update, delete on public.notes to authenticated;

revoke all on public.calendar_events from anon, authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

update public.chat_messages as messages
set user_id = threads.user_id
from public.chat_threads as threads
where threads.id = messages.thread_id
  and messages.user_id <> threads.user_id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_threads_id_user_id_key'
      and conrelid = 'public.chat_threads'::regclass
  ) then
    alter table public.chat_threads
      add constraint chat_threads_id_user_id_key unique (id, user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_thread_id_user_id_fkey'
      and conrelid = 'public.chat_messages'::regclass
  ) then
    alter table public.chat_messages
      add constraint chat_messages_thread_id_user_id_fkey
      foreign key (thread_id, user_id)
      references public.chat_threads (id, user_id)
      on delete cascade;
  end if;
end
$$;

drop index if exists public.chat_threads_user_updated_idx;
create index if not exists chat_threads_active_user_updated_idx
  on public.chat_threads (user_id, updated_at desc)
  where archived_at is null;

drop index if exists public.notes_user_updated_idx;
create index if not exists notes_active_user_updated_idx
  on public.notes (user_id, updated_at desc)
  where archived_at is null;

alter table public.calendar_events
  add column if not exists time_span tstzrange
  generated always as (tstzrange(starts_at, ends_at, '[]')) stored;

update public.calendar_events
set title = left(coalesce(nullif(trim(title), ''), 'Untitled event'), 200)
where title <> left(coalesce(nullif(trim(title), ''), 'Untitled event'), 200);

alter table public.calendar_events
  drop constraint if exists calendar_events_title_length;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'calendar_events_title_present'
      and conrelid = 'public.calendar_events'::regclass
  ) then
    alter table public.calendar_events
      add constraint calendar_events_title_present
      check (char_length(trim(title)) between 1 and 200);
  end if;
end
$$;

create index if not exists calendar_events_user_time_span_gist_idx
  on public.calendar_events
  using gist (user_id, time_span);

create or replace view public.active_chat_threads
with (security_invoker = true)
as
select
  id,
  user_id,
  title,
  archived_at,
  created_at,
  updated_at
from public.chat_threads
where archived_at is null;

create or replace view public.active_notes
with (security_invoker = true)
as
select
  id,
  user_id,
  title,
  content,
  archived_at,
  created_at,
  updated_at
from public.notes
where archived_at is null;

create or replace function public.list_calendar_events_for_range(
  range_start timestamptz,
  range_end timestamptz
)
returns table (
  id uuid,
  user_id uuid,
  title text,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_all_day boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    events.id,
    events.user_id,
    events.title,
    events.description,
    events.starts_at,
    events.ends_at,
    events.is_all_day,
    events.created_at,
    events.updated_at
  from public.calendar_events as events
  where events.user_id = (select auth.uid())
    and events.time_span && tstzrange(range_start, range_end, '[]')
  order by events.starts_at asc, events.id asc;
$$;

drop policy if exists "Users can read own notes" on public.notes;
create policy "Users can read own notes"
on public.notes
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own notes" on public.notes;
create policy "Users can insert own notes"
on public.notes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes"
on public.notes
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes"
on public.notes
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own calendar events" on public.calendar_events;
create policy "Users can read own calendar events"
on public.calendar_events
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own calendar events" on public.calendar_events;
create policy "Users can insert own calendar events"
on public.calendar_events
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own calendar events" on public.calendar_events;
create policy "Users can update own calendar events"
on public.calendar_events
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own calendar events" on public.calendar_events;
create policy "Users can delete own calendar events"
on public.calendar_events
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.active_chat_threads from anon, authenticated;
grant select on public.active_chat_threads to authenticated;

revoke all on public.active_notes from anon, authenticated;
grant select on public.active_notes to authenticated;

revoke all on function public.list_calendar_events_for_range(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.list_calendar_events_for_range(timestamptz, timestamptz) to authenticated;
drop index if exists public.chat_messages_user_thread_created_idx;

create index if not exists chat_messages_thread_user_created_idx
  on public.chat_messages (thread_id, user_id, created_at);
create index if not exists chat_messages_user_id_idx
  on public.chat_messages (user_id);
create table if not exists public.chat_models (
  key text primary key,
  label text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_models_key_not_blank check (char_length(trim(key)) > 0),
  constraint chat_models_label_not_blank check (char_length(trim(label)) > 0),
  constraint chat_models_label_length check (char_length(label) <= 80)
);

create index if not exists chat_models_enabled_sort_idx
  on public.chat_models (enabled, sort_order, label);

insert into public.chat_models (key, label, enabled, sort_order)
values
  ('gpt-5.4', 'GPT-5.4', true, 10),
  ('gpt-5.4-mini', 'GPT-5.4 Mini', true, 20),
  ('gpt-4.1', 'GPT-4.1', true, 30)
on conflict (key) do update
set label = excluded.label,
    sort_order = excluded.sort_order;

drop trigger if exists chat_models_set_updated_at on public.chat_models;
create trigger chat_models_set_updated_at
before update on public.chat_models
for each row
execute function public.touch_workspace_updated_at();

alter table public.chat_models enable row level security;

drop policy if exists "Authenticated users can read enabled chat models" on public.chat_models;
create policy "Authenticated users can read enabled chat models"
on public.chat_models
for select
to authenticated
using (enabled = true);

drop policy if exists "Superadmins can read all chat models" on public.chat_models;
create policy "Superadmins can read all chat models"
on public.chat_models
for select
to authenticated
using ((select private.is_active_superadmin()));

revoke all on public.chat_models from anon, authenticated;
grant select on public.chat_models to authenticated;
grant update (enabled) on public.chat_models to authenticated;

drop policy if exists "Superadmins can update chat models" on public.chat_models;
create policy "Superadmins can update chat models"
on public.chat_models
for update
to authenticated
using ((select private.is_active_superadmin()))
with check ((select private.is_active_superadmin()));
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
alter table public.chat_threads
  add column if not exists selected_tool text not null default '';

update public.chat_threads
set selected_tool = ''
where selected_tool is null;

alter table public.chat_threads
  drop constraint if exists chat_threads_selected_tool_allowed;

alter table public.chat_threads
  add constraint chat_threads_selected_tool_allowed
  check (selected_tool in ('', 'Math', 'Programming', 'Complex Problems'));

drop view if exists public.active_chat_threads;

create view public.active_chat_threads
with (security_invoker = true)
as
select
  id,
  user_id,
  title,
  selected_tool,
  archived_at,
  created_at,
  updated_at
from public.chat_threads
where archived_at is null;

revoke all on public.active_chat_threads from anon, authenticated;
grant select on public.active_chat_threads to authenticated;
grant update (content) on public.chat_messages to authenticated;

drop policy if exists "Users can update own assistant chat messages" on public.chat_messages;
create policy "Users can update own assistant chat messages"
on public.chat_messages
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and role = 'assistant'
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = user_id
  and role = 'assistant'
);
update public.chat_models
set key = 'MiniMaxAI/MiniMax-M2.7:together',
    label = 'MiniMaxAI/MiniMax-M2.7:together',
    enabled = true,
    sort_order = 10
where key = 'gpt-5.4';

insert into public.chat_models (key, label, enabled, sort_order)
values (
  'MiniMaxAI/MiniMax-M2.7:together',
  'MiniMaxAI/MiniMax-M2.7:together',
  true,
  10
)
on conflict (key) do update
set label = excluded.label,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order;

update public.chat_models
set enabled = false
where key in ('gpt-5.4-mini', 'gpt-4.1');
alter table public.chat_models
add column if not exists provider text;

update public.chat_models
set provider = 'huggingface-router'
where provider is null
   or trim(provider) = '';

alter table public.chat_models
alter column provider set default 'huggingface-router';

alter table public.chat_models
alter column provider set not null;

alter table public.chat_models
drop constraint if exists chat_models_provider_allowed;

alter table public.chat_models
add constraint chat_models_provider_allowed
check (provider in ('huggingface-router', 'openrouter'));

insert into public.chat_models (key, label, provider, enabled, sort_order)
values (
  'google/gemma-4-26b-a4b-it:free',
  'Google Gemma 4 26B A4B (Free)',
  'openrouter',
  true,
  20
)
on conflict (key) do update
set label = excluded.label,
    provider = excluded.provider,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order;
insert into public.chat_models (key, label, provider, enabled, sort_order)
values (
  'openrouter/free',
  'OpenRouter Free Router',
  'openrouter',
  true,
  15
)
on conflict (key) do update
set label = excluded.label,
    provider = excluded.provider,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order;
alter table public.chat_threads
  add column if not exists attached_note_id uuid references public.notes (id) on delete set null,
  add column if not exists attached_note_title text not null default '';

create or replace function public.sync_chat_thread_attached_note()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attached_note_record record;
begin
  if new.attached_note_id is null then
    new.attached_note_title := '';
    return new;
  end if;

  select
    notes.id,
    notes.user_id,
    coalesce(nullif(trim(notes.title), ''), 'Untitled note') as display_title
  into attached_note_record
  from public.notes
  where notes.id = new.attached_note_id;

  if attached_note_record.id is null then
    raise exception 'Attached note was not found.';
  end if;

  if attached_note_record.user_id <> new.user_id then
    raise exception 'Attached note must belong to the same user as the chat thread.';
  end if;

  new.attached_note_title := attached_note_record.display_title;
  return new;
end;
$$;

create or replace function public.sync_attached_note_titles_from_notes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_threads
  set attached_note_title = coalesce(nullif(trim(new.title), ''), 'Untitled note')
  where attached_note_id = new.id;

  return new;
end;
$$;

drop trigger if exists chat_threads_sync_attached_note on public.chat_threads;
create trigger chat_threads_sync_attached_note
before insert or update of attached_note_id, user_id
on public.chat_threads
for each row
execute function public.sync_chat_thread_attached_note();

drop trigger if exists notes_sync_chat_thread_titles on public.notes;
create trigger notes_sync_chat_thread_titles
after update of title
on public.notes
for each row
when (old.title is distinct from new.title)
execute function public.sync_attached_note_titles_from_notes();

drop view if exists public.active_chat_threads;

create view public.active_chat_threads
with (security_invoker = true)
as
select
  id,
  user_id,
  title,
  selected_tool,
  attached_note_id,
  attached_note_title,
  archived_at,
  created_at,
  updated_at
from public.chat_threads
where archived_at is null;

revoke all on public.active_chat_threads from anon, authenticated;
grant select on public.active_chat_threads to authenticated;
insert into public.chat_models (key, label, provider, enabled, sort_order)
values (
  'openai/gpt-oss-20b:free',
  'OpenAI GPT-OSS 20B (Free)',
  'openrouter',
  true,
  25
)
on conflict (key) do update
set label = excluded.label,
    provider = excluded.provider,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order;
create table if not exists public.chat_thread_files (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_bucket text not null default 'chat-files',
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null default '',
  size_bytes bigint not null,
  status text not null default 'processing',
  extracted_text text not null default '',
  error_message text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_thread_files_bucket_check check (storage_bucket = 'chat-files'),
  constraint chat_thread_files_name_not_blank check (char_length(trim(original_name)) > 0),
  constraint chat_thread_files_name_length check (char_length(original_name) <= 255),
  constraint chat_thread_files_path_not_blank check (char_length(trim(storage_path)) > 0),
  constraint chat_thread_files_size_limit check (size_bytes > 0 and size_bytes <= 10485760),
  constraint chat_thread_files_status_check check (status in ('processing', 'ready', 'failed')),
  constraint chat_thread_files_error_length check (char_length(error_message) <= 500)
);

create index if not exists chat_thread_files_thread_created_idx
  on public.chat_thread_files (thread_id, created_at asc);

create index if not exists chat_thread_files_user_created_idx
  on public.chat_thread_files (user_id, created_at desc);

drop trigger if exists chat_thread_files_set_updated_at on public.chat_thread_files;
create trigger chat_thread_files_set_updated_at
before update on public.chat_thread_files
for each row
execute function public.touch_workspace_updated_at();

create or replace function public.touch_chat_thread_activity_from_file()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_thread_id uuid := coalesce(new.thread_id, old.thread_id);
begin
  if target_thread_id is not null then
    update public.chat_threads
    set updated_at = timezone('utc', now())
    where id = target_thread_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists chat_thread_files_sync_thread_activity on public.chat_thread_files;
create trigger chat_thread_files_sync_thread_activity
after insert or update or delete on public.chat_thread_files
for each row
execute function public.touch_chat_thread_activity_from_file();

alter table public.chat_thread_files enable row level security;

drop policy if exists "Users can read own chat thread files" on public.chat_thread_files;
create policy "Users can read own chat thread files"
on public.chat_thread_files
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

revoke all on public.chat_thread_files from anon, authenticated;
grant select on public.chat_thread_files to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'chat-files',
  'chat-files',
  false,
  10485760,
  array[
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'text/html',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view own chat storage files" on storage.objects;
create policy "Users can view own chat storage files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can upload own chat storage files" on storage.objects;
create policy "Users can upload own chat storage files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can update own chat storage files" on storage.objects;
create policy "Users can update own chat storage files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chat-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'chat-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can delete own chat storage files" on storage.objects;
create policy "Users can delete own chat storage files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-files'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
