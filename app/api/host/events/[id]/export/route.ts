import JSZip from "jszip";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: event } = await supabase.from("events").select("id, slug, title").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!event) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const admin = createAdminClient();
  const [{ data: photos }, { data: messages }] = await Promise.all([
    admin.from("photos").select("id, storage_path, guest_name, created_at").eq("event_id", id).eq("hidden", false).order("created_at", { ascending: true }),
    admin.from("messages").select("guest_name, text, created_at").eq("event_id", id).eq("hidden", false).order("created_at", { ascending: true }),
  ]);

  const archive = new JSZip();
  archive.file("messages.json", JSON.stringify({ event, messages: messages ?? [] }, null, 2));
  for (const [index, photo] of (photos ?? []).entries()) {
    const { data, error } = await admin.storage.from("event-photos").download(photo.storage_path);
    if (error || !data) continue;
    const extension = photo.storage_path.split(".").pop() || "jpg";
    archive.file(`photos/${String(index + 1).padStart(4, "0")}-${photo.id}.${extension}`, await data.arrayBuffer());
  }
  const zip = await archive.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const body = new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" });
  return new NextResponse(body, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${event.slug}-export.zip"`, "content-length": String(body.size), "cache-control": "no-store" } });
}