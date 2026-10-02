-- Portable memory: belongs to the user, not to a model.
-- scope: global (all projects) | project (project_id required).

create table if not exists memory_items (
  id text primary key,
  user_id text not null,
  project_id text references projects (id) on delete cascade,
  scope text not null check (scope in ('global', 'project')),
  text text not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint memory_items_scope_project check (
    (scope = 'global' and project_id is null)
    or (scope = 'project' and project_id is not null)
  )
);
create index if not exists memory_items_user_idx on memory_items (user_id, updated_at desc);
create index if not exists memory_items_project_idx on memory_items (project_id, updated_at desc);
