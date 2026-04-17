alter table public.chat_models
add column if not exists provider text;

update public.chat_models
set provider = 'huggingface-router'
where provider is null
   or trim(provider) = '';

alter table public.chat_models
alter column provider set default 'huggingface-router';

alter table public.chat_models
alter column provider set not null;

alter table public.chat_models
drop constraint if exists chat_models_provider_allowed;

alter table public.chat_models
add constraint chat_models_provider_allowed
check (provider in ('huggingface-router', 'openrouter'));

insert into public.chat_models (key, label, provider, enabled, sort_order)
values (
  'google/gemma-4-26b-a4b-it:free',
  'Google Gemma 4 26B A4B (Free)',
  'openrouter',
  true,
  20
)
on conflict (key) do update
set label = excluded.label,
    provider = excluded.provider,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order;
