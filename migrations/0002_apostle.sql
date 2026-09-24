create table if not exists threads (
  id text primary key,
  user_id text not null,
  title text not null,
  created_at timestamptz not null default now()
);
create index if not exists threads_user_idx on threads (user_id, created_at desc);

create table if not exists messages (
  id text primary key,
  thread_id text not null,
  user_id text not null,
  role text not null,
  content text not null,
  meta text,
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx on messages (thread_id, created_at);

create table if not exists settings (
  user_id text primary key,
  system_prompt text not null default '',
  plugins text not null default '["get_time","fetch_page"]',
  model_map text not null default '{"cheap":"grok-4.5","default":"grok-4.5","strong":"grok-4.5","vision":"grok-4.5"}',
  enforce_quota boolean not null default false
);

create table if not exists usage_events (
  id text primary key,
  user_id text not null,
  thread_id text,
  model text not null,
  label text not null,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists usage_user_idx on usage_events (user_id, created_at desc);
