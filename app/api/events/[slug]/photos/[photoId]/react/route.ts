import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string; photoId: string }> }) {
  const { slug, photoId } = await params;
  const body = await request.json().catch(() => ({})) as { action?: string; visitorId?: string };
  if (!body.visitorId || body.visitorId.length < 16 || body.visitorId.length > 128 || !["view", "like"].includes(body.action || "")) return NextResponse.json({ error: "invalid_reaction" }, { status: 400 });

  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("id").eq("slug", slug).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!event) return NextResponse.json({ error: "event_inactive" }, { status: 404 });
  const { data: photo } = await admin.from("photos").select("id").eq("id", photoId).eq("event_id", event.id).eq("hidden", false).eq("show_on_wall", true).maybeSingle();
  if (!photo) return NextResponse.json({ error: "photo_not_found" }, { status: 404 });

  const { data, error } = body.action === "view"
    ? await admin.rpc("record_photo_view", { target_photo_id: photoId, target_visitor_id: body.visitorId })
    : await admin.rpc("toggle_photo_like", { target_photo_id: photoId, target_visitor_id: body.visitorId });
  if (error) return NextResponse.json({ error: "reaction_failed" }, { status: 500 });
  const { data: counts } = await admin.from("photos").select("view_count, like_count").eq("id", photoId).single();
  return NextResponse.json({ liked: body.action === "like" ? data === true : undefined, viewCount: counts?.view_count ?? 0, likeCount: counts?.like_count ?? 0 });
}