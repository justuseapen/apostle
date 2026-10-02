-- Workspace projects: containers above the model line.
-- Threads may optionally belong to a project (null = unfiled; existing rows stay valid).

create table if not exists projects (
  id text primary key,
  user_id text not null,
  name text not null,
  default_model_id text,
  created_at timestamptz not null default now()
);
create index if not exists projects_user_idx on projects (user_id, created_at desc);

create table if not exists project_files (
  id text primary key,
  project_id text not null references projects (id) on delete cascade,
  user_id text not null,
  name text not null,
  mime text,
  size_bytes integer not null default 0,
  -- Opaque storage pointer (object key or inline stub); bytes live outside SQL for large files.
  storage_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists project_files_project_idx on project_files (project_id, created_at desc);
create index if not exists project_files_user_idx on project_files (user_id, created_at desc);

create table if not exists prompt_library (
  id text primary key,
  user_id text not null,
  project_id text references projects (id) on delete set null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists prompt_library_user_idx on prompt_library (user_id, created_at desc);
create index if not exists prompt_library_project_idx on prompt_library (project_id, created_at desc);

alter table threads add column if not exists project_id text;
create index if not exists threads_project_idx on threads (user_id, project_id);
