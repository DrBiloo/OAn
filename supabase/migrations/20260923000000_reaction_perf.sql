drop function if exists public.record_photo_view(uuid, text);
drop function if exists public.toggle_photo_like(uuid, text);

create function public.record_photo_view(target_photo_id uuid, target_visitor_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  insert into public.photo_views (photo_id, visitor_id)
  values (target_photo_id, target_visitor_id)
  on conflict (photo_id, visitor_id) do nothing;
  if found then
    update public.photos set view_count = view_count + 1 where id = target_photo_id returning view_count into updated_count;
  else
    select view_count into updated_count from public.photos where id = target_photo_id;
  end if;
  return updated_count;
end;
$$;

create function public.toggle_photo_like(target_photo_id uuid, target_visitor_id text)
returns table(liked boolean, like_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  is_liked boolean;
  updated_count integer;
begin
  if exists (select 1 from public.photo_likes where photo_id = target_photo_id and visitor_id = target_visitor_id) then
    delete from public.photo_likes where photo_id = target_photo_id and visitor_id = target_visitor_id;
    update public.photos set like_count = greatest(0, like_count - 1) where id = target_photo_id returning photos.like_count into updated_count;
    is_liked := false;
  else
    insert into public.photo_likes (photo_id, visitor_id) values (target_photo_id, target_visitor_id);
    update public.photos set like_count = like_count + 1 where id = target_photo_id returning photos.like_count into updated_count;
    is_liked := true;
  end if;
  return query select is_liked, updated_count;
end;
$$;

revoke execute on function public.record_photo_view(uuid, text) from public, anon, authenticated;
revoke execute on function public.toggle_photo_like(uuid, text) from public, anon, authenticated;
grant execute on function public.record_photo_view(uuid, text) to service_role;
grant execute on function public.toggle_photo_like(uuid, text) to service_role;
