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
