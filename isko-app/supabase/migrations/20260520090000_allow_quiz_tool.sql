alter table public.chat_threads
  drop constraint if exists chat_threads_selected_tool_allowed;

alter table public.chat_threads
  add constraint chat_threads_selected_tool_allowed
  check (selected_tool in ('', 'Math', 'Programming', 'Complex Problems', 'Quiz'));

alter table public.chat_folders
  drop constraint if exists chat_folders_selected_tool_allowed;

alter table public.chat_folders
  add constraint chat_folders_selected_tool_allowed
  check (selected_tool in ('', 'Math', 'Programming', 'Complex Problems', 'Quiz'));
