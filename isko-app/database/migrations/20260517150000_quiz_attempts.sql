alter table public.chat_threads
  drop constraint if exists chat_threads_selected_tool_allowed;

alter table public.chat_threads
  add constraint chat_threads_selected_tool_allowed
  check (selected_tool in ('', 'Math', 'Programming', 'Complex Problems', 'Quiz'));

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  topic text not null default '',
  difficulty text not null default 'standard',
  question_count integer not null,
  formats text[] not null default array['multiple_choice']::text[],
  attached_note_id uuid references public.notes (id) on delete set null,
  attached_note_title text not null default '',
  status text not null default 'generated',
  score_points numeric(6, 2),
  max_score_points numeric(6, 2),
  score_percent numeric(5, 2),
  summary_feedback text not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quiz_attempts_title_length check (char_length(trim(title)) between 1 and 160),
  constraint quiz_attempts_question_count_range check (question_count between 1 and 30),
  constraint quiz_attempts_status_allowed check (status in ('generated', 'submitted', 'graded', 'archived')),
  constraint quiz_attempts_difficulty_length check (char_length(trim(difficulty)) between 1 and 40),
  constraint quiz_attempts_formats_not_empty check (array_length(formats, 1) between 1 and 3),
  constraint quiz_attempts_score_range check (
    score_percent is null or (score_percent >= 0 and score_percent <= 100)
  )
);

-- Ensure all columns exist for cases where the table was created by an older version of this migration
alter table public.quiz_attempts
  add column if not exists topic text not null default '',
  add column if not exists difficulty text not null default 'standard',
  add column if not exists question_count integer not null default 6,
  add column if not exists formats text[] not null default array['multiple_choice']::text[],
  add column if not exists attached_note_id uuid references public.notes (id) on delete set null,
  add column if not exists attached_note_title text not null default '',
  add column if not exists score_points numeric(6, 2),
  add column if not exists max_score_points numeric(6, 2),
  add column if not exists score_percent numeric(5, 2),
  add column if not exists summary_feedback text not null default '',
  add column if not exists archived_at timestamptz;

-- Ensure constraints exist for cases where the table was created by an older version of this migration
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quiz_attempts_title_length') then
    alter table public.quiz_attempts add constraint quiz_attempts_title_length check (char_length(trim(title)) between 1 and 160);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quiz_attempts_question_count_range') then
    alter table public.quiz_attempts add constraint quiz_attempts_question_count_range check (question_count between 1 and 30);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quiz_attempts_status_allowed') then
    alter table public.quiz_attempts add constraint quiz_attempts_status_allowed check (status in ('generated', 'submitted', 'graded', 'archived'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quiz_attempts_difficulty_length') then
    alter table public.quiz_attempts add constraint quiz_attempts_difficulty_length check (char_length(trim(difficulty)) between 1 and 40);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quiz_attempts_formats_not_empty') then
    alter table public.quiz_attempts add constraint quiz_attempts_formats_not_empty check (array_length(formats, 1) between 1 and 3);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quiz_attempts_score_range') then
    alter table public.quiz_attempts add constraint quiz_attempts_score_range check (score_percent is null or (score_percent >= 0 and score_percent <= 100));
  end if;
end
$$;

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question_type text not null,
  prompt text not null,
  choices jsonb not null default '[]'::jsonb,
  expected_answer text not null default '',
  explanation text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quiz_questions_type_allowed check (question_type in ('multiple_choice', 'true_false', 'short_answer')),
  constraint quiz_questions_prompt_not_blank check (char_length(trim(prompt)) > 0),
  constraint quiz_questions_order_nonnegative check (sort_order >= 0)
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  answer text not null default '',
  is_correct boolean,
  score numeric(6, 2),
  max_score numeric(6, 2) not null default 1,
  feedback text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quiz_answers_attempt_question_unique unique (attempt_id, question_id),
  constraint quiz_answers_score_range check (
    score is null or (score >= 0 and score <= max_score)
  ),
  constraint quiz_answers_max_score_positive check (max_score > 0)
);

create index if not exists quiz_attempts_user_updated_idx
  on public.quiz_attempts (user_id, updated_at desc)
  where archived_at is null;

create index if not exists quiz_questions_attempt_order_idx
  on public.quiz_questions (attempt_id, sort_order asc, created_at asc);

create index if not exists quiz_answers_attempt_idx
  on public.quiz_answers (attempt_id);

create or replace function public.sync_quiz_attempt_attached_note()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attached_note_record record;
begin
  if new.attached_note_id is null then
    new.attached_note_title := '';
    return new;
  end if;

  select
    notes.id,
    notes.user_id,
    coalesce(nullif(trim(notes.title), ''), 'Untitled note') as display_title
  into attached_note_record
  from public.notes
  where notes.id = new.attached_note_id;

  if attached_note_record.id is null then
    raise exception 'Attached note was not found.';
  end if;

  if attached_note_record.user_id <> new.user_id then
    raise exception 'Attached note must belong to the same user as the quiz attempt.';
  end if;

  new.attached_note_title := attached_note_record.display_title;
  return new;
end;
$$;

create or replace function public.sync_quiz_child_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_owner uuid;
begin
  select user_id
  into attempt_owner
  from public.quiz_attempts
  where id = new.attempt_id;

  if attempt_owner is null then
    raise exception 'Quiz attempt was not found.';
  end if;

  if new.user_id <> attempt_owner then
    raise exception 'Quiz child records must belong to the attempt owner.';
  end if;

  return new;
end;
$$;

create or replace function public.sync_quiz_answer_question()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  question_record record;
begin
  select attempt_id, user_id
  into question_record
  from public.quiz_questions
  where id = new.question_id;

  if question_record.attempt_id is null then
    raise exception 'Quiz question was not found.';
  end if;

  if question_record.attempt_id <> new.attempt_id then
    raise exception 'Quiz answer question must belong to the same attempt.';
  end if;

  if question_record.user_id <> new.user_id then
    raise exception 'Quiz answer must belong to the question owner.';
  end if;

  return new;
end;
$$;

create or replace function public.touch_quiz_attempt_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_attempt_id uuid;
begin
  target_attempt_id := case
    when TG_OP = 'DELETE' then old.attempt_id
    else new.attempt_id
  end;

  if target_attempt_id is not null then
    update public.quiz_attempts
    set updated_at = timezone('utc', now())
    where id = target_attempt_id;
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists quiz_attempts_set_updated_at on public.quiz_attempts;
create trigger quiz_attempts_set_updated_at
before update on public.quiz_attempts
for each row
execute function public.touch_workspace_updated_at();

drop trigger if exists quiz_questions_set_updated_at on public.quiz_questions;
create trigger quiz_questions_set_updated_at
before update on public.quiz_questions
for each row
execute function public.touch_workspace_updated_at();

drop trigger if exists quiz_answers_set_updated_at on public.quiz_answers;
create trigger quiz_answers_set_updated_at
before update on public.quiz_answers
for each row
execute function public.touch_workspace_updated_at();

drop trigger if exists quiz_attempts_sync_attached_note on public.quiz_attempts;
create trigger quiz_attempts_sync_attached_note
before insert or update of attached_note_id, user_id
on public.quiz_attempts
for each row
execute function public.sync_quiz_attempt_attached_note();

drop trigger if exists quiz_questions_sync_user on public.quiz_questions;
create trigger quiz_questions_sync_user
before insert or update of attempt_id, user_id
on public.quiz_questions
for each row
execute function public.sync_quiz_child_user();

drop trigger if exists quiz_answers_sync_user on public.quiz_answers;
create trigger quiz_answers_sync_user
before insert or update of attempt_id, user_id
on public.quiz_answers
for each row
execute function public.sync_quiz_child_user();

drop trigger if exists quiz_answers_sync_question on public.quiz_answers;
create trigger quiz_answers_sync_question
before insert or update of attempt_id, question_id, user_id
on public.quiz_answers
for each row
execute function public.sync_quiz_answer_question();

drop trigger if exists quiz_questions_sync_attempt_activity on public.quiz_questions;
create trigger quiz_questions_sync_attempt_activity
after insert or update or delete on public.quiz_questions
for each row
execute function public.touch_quiz_attempt_activity();

drop trigger if exists quiz_answers_sync_attempt_activity on public.quiz_answers;
create trigger quiz_answers_sync_attempt_activity
after insert or update or delete on public.quiz_answers
for each row
execute function public.touch_quiz_attempt_activity();

create or replace view public.active_quiz_attempts
with (security_invoker = true)
as
select
  id,
  user_id,
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

alter table public.quiz_attempts enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;

drop policy if exists "Users can read own quiz attempts" on public.quiz_attempts;
create policy "Users can read own quiz attempts"
on public.quiz_attempts
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own quiz attempts" on public.quiz_attempts;
create policy "Users can create own quiz attempts"
on public.quiz_attempts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own quiz attempts" on public.quiz_attempts;
create policy "Users can update own quiz attempts"
on public.quiz_attempts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own quiz attempts" on public.quiz_attempts;
create policy "Users can delete own quiz attempts"
on public.quiz_attempts
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own quiz questions" on public.quiz_questions;
create policy "Users can read own quiz questions"
on public.quiz_questions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own quiz questions" on public.quiz_questions;
create policy "Users can create own quiz questions"
on public.quiz_questions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.quiz_attempts
    where id = attempt_id
      and user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own quiz questions" on public.quiz_questions;
create policy "Users can update own quiz questions"
on public.quiz_questions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own quiz questions" on public.quiz_questions;
create policy "Users can delete own quiz questions"
on public.quiz_questions
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own quiz answers" on public.quiz_answers;
create policy "Users can read own quiz answers"
on public.quiz_answers
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own quiz answers" on public.quiz_answers;
create policy "Users can create own quiz answers"
on public.quiz_answers
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.quiz_attempts
    where id = attempt_id
      and user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own quiz answers" on public.quiz_answers;
create policy "Users can update own quiz answers"
on public.quiz_answers
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own quiz answers" on public.quiz_answers;
create policy "Users can delete own quiz answers"
on public.quiz_answers
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.quiz_attempts from anon, authenticated;
revoke all on public.quiz_questions from anon, authenticated;
revoke all on public.quiz_answers from anon, authenticated;
revoke all on public.active_quiz_attempts from anon, authenticated;

grant select, insert, update, delete on public.quiz_attempts to authenticated;
grant select, insert, update, delete on public.quiz_questions to authenticated;
grant select, insert, update, delete on public.quiz_answers to authenticated;
grant select on public.active_quiz_attempts to authenticated;
