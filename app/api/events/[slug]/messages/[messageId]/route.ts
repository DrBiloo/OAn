import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getOwnedMessage(slug: string, messageId: string, visitorId?: string) {
  if (!visitorId) return null;
  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("id").eq("slug", slug).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!event) return null;
  const { data: message } = await admin.from("messages").select("id").eq("id", messageId).eq("event_id", event.id).eq("visitor_id", visitorId).maybeSingle();
  return message ? admin : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string; messageId: string }> }) {
  const { slug, messageId } = await params;
  const body = await request.json().catch(() => ({})) as { text?: string; visitorId?: string; fontStyle?: string };
  const text = body.text?.trim().slice(0, 500);
  const admin = await getOwnedMessage(slug, messageId, body.visitorId);
  if (!admin || !text) return NextResponse.json({ error: "message_not_owned" }, { status: 403 });
  const fontStyle = ["serif", "script", "clean", "elegant", "bold"].includes(body.fontStyle || "") ? body.fontStyle : "serif";
  const { error } = await admin.from("messages").update({ text, font_style: fontStyle }).eq("id", messageId).eq("visitor_id", body.visitorId);
  if (error) return NextResponse.json({ error: "update_failed" }, { status: 500 });
  return NextResponse.json({ updated: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; messageId: string }> }) {
  const { slug, messageId } = await params;
  const body = await request.json().catch(() => ({})) as { visitorId?: string };
  const admin = await getOwnedMessage(slug, messageId, body.visitorId);
  if (!admin) return NextResponse.json({ error: "message_not_owned" }, { status: 403 });
  const { error } = await admin.from("messages").delete().eq("id", messageId).eq("visitor_id", body.visitorId);
  if (error) return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  return NextResponse.json({ deleted: true });
}