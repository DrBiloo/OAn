alter table public.photos
  add column if not exists visitor_id text;

create index if not exists photos_visitor_id_idx on public.photos (visitor_id);
