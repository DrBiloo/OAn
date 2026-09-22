insert into public.events (slug, title, language, event_date, theme, plan, expires_at)
values ('demo', 'Mira & Deniz', 'de', '2026-09-26', '{"primaryColor":"#c96f5c","backgroundColor":"#f8f3ec"}', 'paid', now() + interval '12 months')
on conflict (slug) do update set title = excluded.title, expires_at = excluded.expires_at;

insert into public.messages (event_id, guest_name, text)
select id, 'Sophie', 'Auf euch und all die Abenteuer, die noch kommen!' from public.events where slug = 'demo'
and not exists (select 1 from public.messages where event_id = public.events.id);
