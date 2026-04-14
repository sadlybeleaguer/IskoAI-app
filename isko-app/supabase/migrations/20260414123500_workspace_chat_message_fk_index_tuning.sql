drop index if exists public.chat_messages_user_thread_created_idx;

create index if not exists chat_messages_thread_user_created_idx
  on public.chat_messages (thread_id, user_id, created_at);
