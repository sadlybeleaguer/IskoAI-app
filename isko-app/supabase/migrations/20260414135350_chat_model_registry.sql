create table if not exists public.chat_models (
  key text primary key,
  label text not null,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chat_models_key_not_blank check (char_length(trim(key)) > 0),
  constraint chat_models_label_not_blank check (char_length(trim(label)) > 0),
  constraint chat_models_label_length check (char_length(label) <= 80)
);

create index if not exists chat_models_enabled_sort_idx
  on public.chat_models (enabled, sort_order, label);

insert into public.chat_models (key, label, enabled, sort_order)
values
  ('gpt-5.4', 'GPT-5.4', true, 10),
  ('gpt-5.4-mini', 'GPT-5.4 Mini', true, 20),
  ('gpt-4.1', 'GPT-4.1', true, 30)
on conflict (key) do update
set label = excluded.label,
    sort_order = excluded.sort_order;

drop trigger if exists chat_models_set_updated_at on public.chat_models;
create trigger chat_models_set_updated_at
before update on public.chat_models
for each row
execute function public.touch_workspace_updated_at();

alter table public.chat_models enable row level security;

drop policy if exists "Authenticated users can read enabled chat models" on public.chat_models;
create policy "Authenticated users can read enabled chat models"
on public.chat_models
for select
to authenticated
using (enabled = true);

drop policy if exists "Superadmins can read all chat models" on public.chat_models;
create policy "Superadmins can read all chat models"
on public.chat_models
for select
to authenticated
using ((select private.is_active_superadmin()));

revoke all on public.chat_models from anon, authenticated;
grant select on public.chat_models to authenticated;
