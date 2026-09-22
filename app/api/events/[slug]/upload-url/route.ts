import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json() as { filename?: string; contentType?: string };
  if (!allowRequest(`upload:${slug}:${clientIp(request)}`, 12)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
  if (!body.filename || !body.contentType || !allowedTypes.has(body.contentType)) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("id, plan, expires_at").eq("slug", slug).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!event) return NextResponse.json({ error: "Event inactive" }, { status: 404 });
  if (event.plan === "free") {
    const { count } = await admin.from("photos").select("id", { count: "exact", head: true }).eq("event_id", event.id);
    if ((count ?? 0) >= 10) return NextResponse.json({ error: "Free plan limit reached" }, { status: 413 });
  }
  const extension = body.filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const id = crypto.randomUUID();
  const originalPath = `${event.id}/original/${id}.${extension}`;
  const thumbPath = `${event.id}/thumb/${id}.webp`;
  const [{ data: original, error: originalError }, { data: thumbnail, error: thumbnailError }] = await Promise.all([admin.storage.from("event-photos").createSignedUploadUrl(originalPath), admin.storage.from("event-photos").createSignedUploadUrl(thumbPath)]);
  if (originalError || thumbnailError || !original || !thumbnail) return NextResponse.json({ error: "Could not create upload URLs" }, { status: 500 });
  return NextResponse.json({ original: { path: originalPath, token: original.token }, thumbnail: { path: thumbPath, token: thumbnail.token } });
}
