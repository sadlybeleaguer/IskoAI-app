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
