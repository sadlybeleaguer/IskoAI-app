update public.chat_models
set key = 'MiniMaxAI/MiniMax-M2.7:together',
    label = 'MiniMaxAI/MiniMax-M2.7:together',
    enabled = true,
    sort_order = 10
where key = 'gpt-5.4';

insert into public.chat_models (key, label, enabled, sort_order)
values (
  'MiniMaxAI/MiniMax-M2.7:together',
  'MiniMaxAI/MiniMax-M2.7:together',
  true,
  10
)
on conflict (key) do update
set label = excluded.label,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order;

update public.chat_models
set enabled = false
where key in ('gpt-5.4-mini', 'gpt-4.1');
