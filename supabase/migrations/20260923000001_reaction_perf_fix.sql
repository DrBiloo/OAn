-- The previous migration's toggle_photo_like used RETURNS TABLE column names
-- ("liked", "like_count") that collide with the photos.like_count column,
-- which plpgsql resolves as an ambiguous reference by default and errors on.
-- Rename the output columns so they no longer shadow real table columns.
drop function if exists public.toggle_photo_like(uuid, text);

create function public.toggle_photo_like(target_photo_id uuid, target_visitor_id text)
returns table(out_liked boolean, out_like_count integer)
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

revoke execute on function public.toggle_photo_like(uuid, text) from public, anon, authenticated;
grant execute on function public.toggle_photo_like(uuid, text) to service_role;
