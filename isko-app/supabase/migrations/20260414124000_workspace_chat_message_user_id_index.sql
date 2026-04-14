create index if not exists chat_messages_user_id_idx
  on public.chat_messages (user_id);
