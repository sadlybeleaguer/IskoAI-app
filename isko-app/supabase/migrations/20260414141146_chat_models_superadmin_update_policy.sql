grant update (enabled) on public.chat_models to authenticated;

drop policy if exists "Superadmins can update chat models" on public.chat_models;
create policy "Superadmins can update chat models"
on public.chat_models
for update
to authenticated
using ((select private.is_active_superadmin()))
with check ((select private.is_active_superadmin()));
