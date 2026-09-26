import { NextResponse } from "next/server";
import { exportEventZip } from "@/lib/export";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: event } = await supabase.from("events").select("id, slug, title").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return exportEventZip(event);
}
