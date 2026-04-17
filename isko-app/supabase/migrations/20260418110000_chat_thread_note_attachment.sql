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
