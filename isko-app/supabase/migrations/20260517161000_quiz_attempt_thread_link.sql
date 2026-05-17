alter table public.quiz_attempts
  add column if not exists thread_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'quiz_attempts_thread_id_fkey'
      and conrelid = 'public.quiz_attempts'::regclass
  ) then
    alter table public.quiz_attempts
      add constraint quiz_attempts_thread_id_fkey
      foreign key (thread_id)
      references public.chat_threads (id)
      on delete set null;
  end if;
end;
$$;

create index if not exists quiz_attempts_user_thread_updated_idx
  on public.quiz_attempts (user_id, thread_id, updated_at desc)
  where archived_at is null and thread_id is not null;

create or replace function public.sync_quiz_attempt_thread_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread_owner uuid;
begin
  if new.thread_id is null then
    return new;
  end if;

  select user_id
  into thread_owner
  from public.chat_threads
  where id = new.thread_id;

  if thread_owner is null then
    raise exception 'Quiz thread was not found.';
  end if;

  if thread_owner <> new.user_id then
    raise exception 'Quiz thread must belong to the attempt owner.';
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_quiz_attempt_thread_owner() from public;
revoke execute on function public.sync_quiz_attempt_thread_owner() from anon, authenticated;

drop trigger if exists quiz_attempts_sync_thread_owner on public.quiz_attempts;
create trigger quiz_attempts_sync_thread_owner
before insert or update of thread_id, user_id
on public.quiz_attempts
for each row
execute function public.sync_quiz_attempt_thread_owner();

drop view if exists public.active_quiz_attempts;

create view public.active_quiz_attempts
with (security_invoker = true)
as
select
  id,
  user_id,
  thread_id,
  title,
  topic,
  difficulty,
  question_count,
  formats,
  attached_note_id,
  attached_note_title,
  status,
  score_points,
  max_score_points,
  score_percent,
  summary_feedback,
  archived_at,
  created_at,
  updated_at
from public.quiz_attempts
where archived_at is null;

revoke all on public.active_quiz_attempts from anon, authenticated;
grant select on public.active_quiz_attempts to authenticated;
