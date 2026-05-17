create index if not exists chat_folders_attached_note_id_idx
  on public.chat_folders (attached_note_id)
  where attached_note_id is not null;

revoke execute on function public.sync_attached_note_titles_from_notes() from public;
revoke execute on function public.sync_attached_note_titles_from_notes() from anon, authenticated;

revoke execute on function public.sync_chat_folder_attached_note() from public;
revoke execute on function public.sync_chat_folder_attached_note() from anon, authenticated;

revoke execute on function public.sync_chat_thread_activity() from public;
revoke execute on function public.sync_chat_thread_activity() from anon, authenticated;

revoke execute on function public.sync_chat_thread_attached_note() from public;
revoke execute on function public.sync_chat_thread_attached_note() from anon, authenticated;

revoke execute on function public.sync_chat_thread_folder() from public;
revoke execute on function public.sync_chat_thread_folder() from anon, authenticated;

revoke execute on function public.sync_profile_from_auth_user() from public;
revoke execute on function public.sync_profile_from_auth_user() from anon, authenticated;

revoke execute on function public.sync_quiz_answer_question() from public;
revoke execute on function public.sync_quiz_answer_question() from anon, authenticated;

revoke execute on function public.sync_quiz_attempt_attached_note() from public;
revoke execute on function public.sync_quiz_attempt_attached_note() from anon, authenticated;

revoke execute on function public.sync_quiz_child_user() from public;
revoke execute on function public.sync_quiz_child_user() from anon, authenticated;

revoke execute on function public.touch_chat_folder_activity_from_file() from public;
revoke execute on function public.touch_chat_folder_activity_from_file() from anon, authenticated;

revoke execute on function public.touch_chat_thread_activity_from_file() from public;
revoke execute on function public.touch_chat_thread_activity_from_file() from anon, authenticated;

revoke execute on function public.touch_chat_threads_updated_at() from public;
revoke execute on function public.touch_chat_threads_updated_at() from anon, authenticated;

revoke execute on function public.touch_profiles_updated_at() from public;
revoke execute on function public.touch_profiles_updated_at() from anon, authenticated;

revoke execute on function public.touch_quiz_attempt_activity() from public;
revoke execute on function public.touch_quiz_attempt_activity() from anon, authenticated;
