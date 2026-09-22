alter table public.messages drop constraint if exists messages_font_style_check;
alter table public.messages add constraint messages_font_style_check check (font_style in ('serif', 'script', 'clean', 'elegant', 'bold'));
