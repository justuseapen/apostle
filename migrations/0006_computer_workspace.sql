-- Browser Computer spike: per-user / per-thread virtual workspace (not host FS).
-- Soft-enable computer plugin for new operators; existing rows get ensureComputerEnabled.
create table if not exists computer_files (
  user_id text not null,
  thread_id text not null default 'default',
  path text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, thread_id, path)
);
create index if not exists computer_files_thread_idx
  on computer_files (user_id, thread_id, updated_at desc);

alter table settings
  alter column plugins set default '["get_time","fetch_page","calc","create_missing","computer"]';
