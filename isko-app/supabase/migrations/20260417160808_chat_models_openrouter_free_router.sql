insert into public.chat_models (key, label, provider, enabled, sort_order)
values (
  'openrouter/free',
  'OpenRouter Free Router',
  'openrouter',
  true,
  15
)
on conflict (key) do update
set label = excluded.label,
    provider = excluded.provider,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order;
