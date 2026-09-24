create table if not exists gaps (
  id text primary key,
  user_id text not null,
  slug text not null,
  title text not null,
  example text not null,
  hits integer not null default 1,
  status text not null default 'new',
  note text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);
create index if not exists gaps_user_idx on gaps (user_id, updated_at desc);
