import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!allowRequest(`photo:${slug}:${clientIp(request)}`, 12)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const body = await request.json() as { storagePath?: string; thumbPath?: string; guestName?: string; visitorId?: string };
  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("id").eq("slug", slug).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!event || !body.storagePath?.startsWith(`${event.id}/original/`) || !body.thumbPath?.startsWith(`${event.id}/thumb/`)) return NextResponse.json({ error: "Invalid event or paths" }, { status: 400 });
  const [originalExists, thumbExists] = await Promise.all([storageObjectExists(admin, body.storagePath), storageObjectExists(admin, body.thumbPath)]);
  if (!originalExists || !thumbExists) return NextResponse.json({ error: "upload_incomplete" }, { status: 400 });
  if (!body.visitorId || body.visitorId.length < 16 || body.visitorId.length > 128) return NextResponse.json({ error: "visitor_required" }, { status: 400 });
  const { data, error } = await admin.from("photos").insert({ event_id: event.id, storage_path: body.storagePath, thumb_path: body.thumbPath, guest_name: body.guestName?.slice(0, 100) || null, visitor_id: body.visitorId }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

async function storageObjectExists(admin: ReturnType<typeof createAdminClient>, path: string) {
  const separator = path.lastIndexOf("/");
  const folder = path.slice(0, separator);
  const filename = path.slice(separator + 1);
  const { data, error } = await admin.storage.from("event-photos").list(folder, { search: filename, limit: 10 });
  return !error && data?.some((file) => file.name === filename) === true;
}
