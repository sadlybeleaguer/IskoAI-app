drop policy if exists "Users can delete own chat threads" on public.chat_threads;
create policy "Users can delete own chat threads"
on public.chat_threads
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

grant delete on public.chat_threads to authenticated;
