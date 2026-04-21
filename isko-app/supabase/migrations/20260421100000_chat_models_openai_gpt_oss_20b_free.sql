insert into public.chat_models (key, label, provider, enabled, sort_order)
values (
  'openai/gpt-oss-20b:free',
  'OpenAI GPT-OSS 20B (Free)',
  'openrouter',
  true,
  25
)
on conflict (key) do update
set label = excluded.label,
    provider = excluded.provider,
    enabled = excluded.enabled,
    sort_order = excluded.sort_order;
