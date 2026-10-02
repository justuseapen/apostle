-- Missions (AgentRuntimePort) + workspace Skills (SkillsRegistry).
-- Skills are instruction bundles owned by the user — distinct from harness Plugins.

create table if not exists missions (
  id text primary key,
  user_id text not null,
  project_id text references projects (id) on delete set null,
  thread_id text,
  title text not null,
  brief text not null default '',
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists missions_user_idx on missions (user_id, created_at desc);
create index if not exists missions_status_idx on missions (user_id, status);

create table if not exists skills (
  id text primary key,
  user_id text not null,
  project_id text references projects (id) on delete set null,
  name text not null,
  description text not null default '',
  instructions text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists skills_user_idx on skills (user_id, updated_at desc);
create index if not exists skills_project_idx on skills (project_id, updated_at desc);
