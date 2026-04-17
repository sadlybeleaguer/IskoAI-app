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
