import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { exportEventZip, exportGuestbookPdf } from "@/lib/export";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const digest = (value: string) => createHash("sha256").update(value).digest();

// Password-protected export, only for the public demo event (which has no owner/dashboard).
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const expected = process.env.DEMO_EXPORT_PASSWORD;
  if (slug !== "demo" || !expected) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!(await allowRequest(`demo-export:${clientIp(request)}`, 5, 15 * 60))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { password, kind } = await request.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !timingSafeEqual(digest(password), digest(expected))) return NextResponse.json({ error: "wrong_password" }, { status: 401 });

  const { data: event } = await createAdminClient().from("events").select("id, slug, title, event_date, language").eq("slug", slug).maybeSingle();
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return kind === "guestbook" ? exportGuestbookPdf(event) : exportEventZip(event, { photosOnly: true });
}
