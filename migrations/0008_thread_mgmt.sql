-- Thread management: rename/delete/reorder + search hygiene.
-- sort_order: lower = higher in sidebar. updated_at: bump on rename / activity.

alter table threads add column if not exists sort_order integer not null default 0;
alter table threads add column if not exists updated_at timestamptz not null default now();

create index if not exists threads_user_sort_idx on threads (user_id, sort_order asc, updated_at desc);
