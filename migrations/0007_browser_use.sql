-- Allowlisted Browser plugin: screenshot trail + desk allowlist.
-- Soft-enable browser for new operators; existing rows get ensurePluginEnabled("browser").

create table if not exists browser_screenshots (
  id text primary key,
  user_id text not null,
  thread_id text not null default 'default',
  url text not null,
  title text not null default '',
  action text not null default 'snapshot',
  mime text not null default 'image/png',
  data_base64 text not null,
  created_at timestamptz not null default now()
);
create index if not exists browser_screenshots_thread_idx
  on browser_screenshots (user_id, thread_id, created_at desc);

alter table settings
  add column if not exists browser_allowlist text not null default '["example.com","*.example.com","en.wikipedia.org","www.wikipedia.org","*.wikipedia.org","github.com","*.github.com","developer.mozilla.org","httpbin.org","*.httpbin.org"]';

alter table settings
  alter column plugins set default '["get_time","fetch_page","calc","create_missing","computer","browser"]';
