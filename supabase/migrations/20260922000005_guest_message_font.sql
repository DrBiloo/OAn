alter table public.messages
  add column if not exists font_style text not null default 'serif'
  check (font_style in ('serif', 'script', 'clean'));
