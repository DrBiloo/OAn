import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string; photoId: string }> }) {
  const { slug, photoId } = await params;
  const body = await request.json().catch(() => ({})) as { action?: string; visitorId?: string };
  if (!body.visitorId || body.visitorId.length < 16 || body.visitorId.length > 128 || !["view", "like"].includes(body.action || "")) return NextResponse.json({ error: "invalid_reaction" }, { status: 400 });

  const admin = createAdminClient();
  const { data: photo } = await admin
    .from("photos")
    .select("id, events!inner(slug, expires_at)")
    .eq("id", photoId)
    .eq("hidden", false)
    .eq("show_on_wall", true)
    .eq("events.slug", slug)
    .gt("events.expires_at", new Date().toISOString())
    .maybeSingle();
  if (!photo) return NextResponse.json({ error: "photo_not_found" }, { status: 404 });

  if (body.action === "view") {
    const { data, error } = await admin.rpc("record_photo_view", { target_photo_id: photoId, target_visitor_id: body.visitorId });
    if (error) return NextResponse.json({ error: "reaction_failed" }, { status: 500 });
    return NextResponse.json({ viewCount: data ?? 0 });
  }
  const { data, error } = await admin.rpc("toggle_photo_like", { target_photo_id: photoId, target_visitor_id: body.visitorId }).single();
  if (error) return NextResponse.json({ error: "reaction_failed" }, { status: 500 });
  const result = data as { out_liked: boolean; out_like_count: number } | null;
  return NextResponse.json({ liked: result?.out_liked ?? false, likeCount: result?.out_like_count ?? 0 });
}
