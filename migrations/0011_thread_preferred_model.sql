-- Mid-thread model preference: picker changes the thread default without rewriting history.
-- Messages keep attribution in meta.model; this column is the next-turn default.

alter table threads add column if not exists preferred_model_id text;
