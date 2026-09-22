alter table public.photos
  add column if not exists view_count integer not null default 0 check (view_count >= 0),
  add column if not exists like_count integer not null default 0 check (like_count >= 0);

create table if not exists public.photo_views (
  photo_id uuid not null references public.photos(id) on delete cascade,
  visitor_id text not null check (char_length(visitor_id) between 16 and 128),
  created_at timestamptz not null default now(),
  primary key (photo_id, visitor_id)
);

create table if not exists public.photo_likes (
  photo_id uuid not null references public.photos(id) on delete cascade,
  visitor_id text not null check (char_length(visitor_id) between 16 and 128),
  created_at timestamptz not null default now(),
  primary key (photo_id, visitor_id)
);

alter table public.photo_views enable row level security;
alter table public.photo_likes enable row level security;

create or replace function public.record_photo_view(target_photo_id uuid, target_visitor_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.photo_views (photo_id, visitor_id)
  values (target_photo_id, target_visitor_id)
  on conflict (photo_id, visitor_id) do nothing;
  if found then
    update public.photos set view_count = view_count + 1 where id = target_photo_id;
  end if;
end;
$$;

create or replace function public.toggle_photo_like(target_photo_id uuid, target_visitor_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  liked boolean;
begin
  if exists (select 1 from public.photo_likes where photo_id = target_photo_id and visitor_id = target_visitor_id) then
    delete from public.photo_likes where photo_id = target_photo_id and visitor_id = target_visitor_id;
    update public.photos set like_count = greatest(0, like_count - 1) where id = target_photo_id;
    liked := false;
  else
    insert into public.photo_likes (photo_id, visitor_id) values (target_photo_id, target_visitor_id);
    update public.photos set like_count = like_count + 1 where id = target_photo_id;
    liked := true;
  end if;
  return liked;
end;
$$;

revoke execute on function public.record_photo_view(uuid, text) from public, anon, authenticated;
revoke execute on function public.toggle_photo_like(uuid, text) from public, anon, authenticated;
grant execute on function public.record_photo_view(uuid, text) to service_role;
grant execute on function public.toggle_photo_like(uuid, text) to service_role;
