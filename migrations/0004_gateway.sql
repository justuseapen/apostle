-- Operator-owned OpenAI-compatible gateway (base URL + key).
-- Empty key falls back to process.env.XAI_API_KEY when present.
alter table settings
  add column if not exists gateway_base_url text not null default 'https://api.x.ai/v1',
  add column if not exists gateway_api_key text not null default '';

alter table settings
  alter column plugins set default '["get_time","fetch_page","calc"]';
