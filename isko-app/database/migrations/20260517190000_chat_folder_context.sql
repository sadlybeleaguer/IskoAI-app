create table if not exists public.chat_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  system_prompt text not null default '',
  selected_tool text not null default '',
  attached_note_id uuid references public.notes (id) on delete set null,
  attached_note_title text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_folders_title_length check (char_length(trim(title)) between 1 and 120)
);

alter table public.chat_folders
  add column if not exists system_prompt text not null default '',
  add column if not exists selected_tool text not null default '',
  add column if not exists attached_note_id uuid references public.notes (id) on delete set null,
  add column if not exists attached_note_title text not null default '',
  add column if not exists archived_at timestamptz,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.chat_folders
  drop constraint if exists chat_folders_selected_tool_allowed;

alter table public.chat_folders
  add constraint chat_folders_selected_tool_allowed
  check (selected_tool in ('', 'Math', 'Programming', 'Complex Problems', 'Quiz'));

create index if not exists chat_folders_user_created_idx
  on public.chat_folders (user_id, created_at asc);

create or replace function public.sync_chat_folder_attached_note()
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
    raise exception 'Attached note must belong to the same user as the chat folder.';
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

  update public.chat_folders
  set attached_note_title = coalesce(nullif(trim(new.title), ''), 'Untitled note')
  where attached_note_id = new.id;

  return new;
end;
$$;

drop trigger if exists chat_folders_set_updated_at on public.chat_folders;
create trigger chat_folders_set_updated_at
before update on public.chat_folders
for each row
execute function public.touch_workspace_updated_at();

drop trigger if exists chat_folders_sync_attached_note on public.chat_folders;
create trigger chat_folders_sync_attached_note
before insert or update of attached_note_id, user_id
on public.chat_folders
for each row
execute function public.sync_chat_folder_attached_note();

alter table public.chat_folders enable row level security;

drop policy if exists "Users can read own chat folders" on public.chat_folders;
create policy "Users can read own chat folders"
on public.chat_folders
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can create own chat folders" on public.chat_folders;
create policy "Users can create own chat folders"
on public.chat_folders
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update own chat folders" on public.chat_folders;
create policy "Users can update own chat folders"
on public.chat_folders
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete own chat folders" on public.chat_folders;
create policy "Users can delete own chat folders"
on public.chat_folders
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

revoke all on public.chat_folders from anon, authenticated;
grant select, insert, update, delete on public.chat_folders to authenticated;

alter table public.chat_threads
  add column if not exists folder_id uuid,
  add column if not exists hidden_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_threads_folder_id_fkey'
      and conrelid = 'public.chat_threads'::regclass
  ) then
    alter table public.chat_threads
      add constraint chat_threads_folder_id_fkey
      foreign key (folder_id)
      references public.chat_folders (id)
      on delete set null;
  end if;
end
$$;

create or replace function public.sync_chat_thread_folder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  folder_record record;
begin
  if new.folder_id is null then
    return new;
  end if;

  select
    chat_folders.id,
    chat_folders.user_id,
    chat_folders.archived_at
  into folder_record
  from public.chat_folders
  where chat_folders.id = new.folder_id;

  if folder_record.id is null or folder_record.archived_at is not null then
    raise exception 'Chat folder was not found.';
  end if;

  if folder_record.user_id <> new.user_id then
    raise exception 'Chat folder must belong to the same user as the chat thread.';
  end if;

  return new;
end;
$$;

drop trigger if exists chat_threads_sync_folder on public.chat_threads;
create trigger chat_threads_sync_folder
before insert or update of folder_id, user_id
on public.chat_threads
for each row
execute function public.sync_chat_thread_folder();

drop view if exists public.active_chat_threads;
create view public.active_chat_threads
with (security_invoker = true)
as
select
  id,
  user_id,
  folder_id,
  title,
  selected_tool,
  attached_note_id,
  attached_note_title,
  hidden_at,
  archived_at,
  created_at,
  updated_at
from public.chat_threads
where archived_at is null;

revoke all on public.active_chat_threads from anon, authenticated;
grant select on public.active_chat_threads to authenticated;

create table if not exists public.chat_folder_files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.chat_folders (id) on delete cascade,
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
  constraint chat_folder_files_bucket_check check (storage_bucket = 'chat-files'),
  constraint chat_folder_files_name_not_blank check (char_length(trim(original_name)) > 0),
  constraint chat_folder_files_name_length check (char_length(original_name) <= 255),
  constraint chat_folder_files_path_not_blank check (char_length(trim(storage_path)) > 0),
  constraint chat_folder_files_size_limit check (size_bytes > 0 and size_bytes <= 10485760),
  constraint chat_folder_files_status_check check (status in ('processing', 'ready', 'failed')),
  constraint chat_folder_files_error_length check (char_length(error_message) <= 500)
);

create index if not exists chat_folder_files_folder_created_idx
  on public.chat_folder_files (folder_id, created_at asc);

create index if not exists chat_folder_files_user_created_idx
  on public.chat_folder_files (user_id, created_at desc);

create or replace function public.touch_chat_folder_activity_from_file()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_folder_id uuid := coalesce(new.folder_id, old.folder_id);
begin
  if target_folder_id is not null then
    update public.chat_folders
    set updated_at = timezone('utc', now())
    where id = target_folder_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists chat_folder_files_set_updated_at on public.chat_folder_files;
create trigger chat_folder_files_set_updated_at
before update on public.chat_folder_files
for each row
execute function public.touch_workspace_updated_at();

drop trigger if exists chat_folder_files_sync_folder_activity on public.chat_folder_files;
create trigger chat_folder_files_sync_folder_activity
after insert or update or delete on public.chat_folder_files
for each row
execute function public.touch_chat_folder_activity_from_file();

alter table public.chat_folder_files enable row level security;

drop policy if exists "Users can read own chat folder files" on public.chat_folder_files;
create policy "Users can read own chat folder files"
on public.chat_folder_files
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

revoke all on public.chat_folder_files from anon, authenticated;
grant select on public.chat_folder_files to authenticated;
