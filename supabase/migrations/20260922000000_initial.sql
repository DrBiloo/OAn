create extension if not exists pgcrypto;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  slug text unique not null,
  title text not null,
  language text not null default 'de' check (language in ('de', 'tr')),
  theme jsonb not null default '{"primaryColor":"#d97963","backgroundColor":"#fbfaf6"}'::jsonb,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create or replace function public.set_event_expiry()
returns trigger
language plpgsql
as $$
begin
  if new.expires_at is null then
    new.expires_at := now() + case when new.plan = 'paid' then interval '12 months' else interval '14 days' end;
  end if;
  return new;
end;
$$;

create trigger events_set_expiry before insert on public.events
for each row execute function public.set_event_expiry();

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  storage_path text not null,
  thumb_path text not null,
  guest_name text,
  show_on_wall boolean not null default true,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_name text,
  text text not null check (char_length(text) <= 500),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.photos enable row level security;
alter table public.messages enable row level security;

create policy "owners manage own events" on public.events for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "active events public read" on public.events for select to anon, authenticated using (expires_at > now());
create policy "owners manage own photos" on public.photos for all to authenticated using (exists (select 1 from public.events where id = photos.event_id and owner_id = auth.uid())) with check (exists (select 1 from public.events where id = photos.event_id and owner_id = auth.uid()));
create policy "active visible photos public read" on public.photos for select to anon, authenticated using (hidden = false and show_on_wall = true and exists (select 1 from public.events where id = photos.event_id and expires_at > now()));
create policy "owners manage own messages" on public.messages for all to authenticated using (exists (select 1 from public.events where id = messages.event_id and owner_id = auth.uid())) with check (exists (select 1 from public.events where id = messages.event_id and owner_id = auth.uid()));
create policy "active visible messages public read" on public.messages for select to anon, authenticated using (hidden = false and exists (select 1 from public.events where id = messages.event_id and expires_at > now()));

insert into storage.buckets (id, name, public) values ('event-photos', 'event-photos', false) on conflict (id) do nothing;
alter publication supabase_realtime add table public.photos;
alter publication supabase_realtime add table public.messages;

-- TODO: später auf resumable Uploads (TUS) umstellen.
