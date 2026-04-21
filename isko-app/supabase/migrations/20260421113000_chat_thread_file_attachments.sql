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
