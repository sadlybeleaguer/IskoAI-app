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
