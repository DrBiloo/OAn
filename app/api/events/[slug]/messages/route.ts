import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowRequest, clientIp } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!allowRequest(`message:${slug}:${clientIp(request)}`, 8)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const body = await request.json() as { text?: string; guestName?: string; visitorId?: string; fontStyle?: string };
  const text = body.text?.trim().slice(0, 500);
  if (!text) return NextResponse.json({ error: "Message required" }, { status: 400 });
  if (!body.visitorId || body.visitorId.length < 16 || body.visitorId.length > 128) return NextResponse.json({ error: "visitor_required" }, { status: 400 });
  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("id").eq("slug", slug).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!event) return NextResponse.json({ error: "Event inactive" }, { status: 404 });
  const fontStyle = ["serif", "script", "clean", "elegant", "bold"].includes(body.fontStyle || "") ? body.fontStyle : "serif";
  const { data, error } = await admin.from("messages").insert({ event_id: event.id, text, guest_name: body.guestName?.trim().slice(0, 100) || null, visitor_id: body.visitorId, font_style: fontStyle }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const response = NextResponse.json(data, { status: 201 });
  response.cookies.set("oan_visitor_id", body.visitorId, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
