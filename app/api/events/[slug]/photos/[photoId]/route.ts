import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; photoId: string }> }) {
  const { slug, photoId } = await params;
  const body = await request.json().catch(() => ({})) as { visitorId?: string };
  if (!body.visitorId || body.visitorId.length < 16 || body.visitorId.length > 128) return NextResponse.json({ error: "visitor_required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("id").eq("slug", slug).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!event) return NextResponse.json({ error: "event_inactive" }, { status: 404 });
  const { data: photo } = await admin.from("photos").select("id, storage_path, thumb_path").eq("id", photoId).eq("event_id", event.id).eq("visitor_id", body.visitorId).maybeSingle();
  if (!photo) return NextResponse.json({ error: "photo_not_owned" }, { status: 403 });

  await admin.storage.from("event-photos").remove([photo.storage_path, photo.thumb_path]);
  const { error } = await admin.from("photos").delete().eq("id", photo.id).eq("visitor_id", body.visitorId);
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ deleted: true });
}