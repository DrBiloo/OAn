alter table public.messages
  add column if not exists visitor_id text;

create index if not exists messages_visitor_id_idx on public.messages (visitor_id);
