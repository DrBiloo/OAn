import JSZip from "jszip";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { createGuestbookPdf } from "./guestbook-pdf";
import { createAdminClient } from "./supabase/admin";

type ExportEvent = { id: string; slug: string; title: string; event_date: string | null; language: string };

function fileResponse(bytes: Uint8Array, contentType: string, filename: string) {
  const body = new Blob([bytes.buffer as ArrayBuffer], { type: contentType });
  return new NextResponse(body, { headers: { "content-type": contentType, "content-disposition": `attachment; filename="${filename}"`, "content-length": String(body.size), "cache-control": "no-store" } });
}

async function getMessages(eventId: string) {
  const { data } = await createAdminClient().from("messages").select("guest_name, text, created_at").eq("event_id", eventId).eq("hidden", false).order("created_at", { ascending: true });
  return data ?? [];
}

async function renderGuestbook(event: ExportEvent, messages: Awaited<ReturnType<typeof getMessages>>) {
  const t = await getTranslations({ locale: event.language, namespace: "export" });
  return { filename: t("guestbookFile"), bytes: await createGuestbookPdf(event, messages, event.language, { title: t("guestbookTitle"), guest: t("guest"), empty: t("empty"), page: t("page") }) };
}

export async function exportGuestbookPdf(event: ExportEvent) {
  const { filename, bytes } = await renderGuestbook(event, await getMessages(event.id));
  return fileResponse(bytes, "application/pdf", `${event.slug}-${filename}`);
}

// Full export (photos, guestbook PDF, messages.json), or photos only with { photosOnly: true }.
export async function exportEventZip(event: ExportEvent, { photosOnly = false } = {}) {
  const admin = createAdminClient();
  const [{ data: photos }, messages] = await Promise.all([
    admin.from("photos").select("id, storage_path, guest_name, created_at").eq("event_id", event.id).eq("hidden", false).order("created_at", { ascending: true }),
    photosOnly ? Promise.resolve([]) : getMessages(event.id),
  ]);

  const archive = new JSZip();
  if (!photosOnly) {
    archive.file("messages.json", JSON.stringify({ event, messages }, null, 2));
    const guestbook = await renderGuestbook(event, messages);
    archive.file(guestbook.filename, guestbook.bytes);
  }
  for (const [index, photo] of (photos ?? []).entries()) {
    const { data, error } = await admin.storage.from("event-photos").download(photo.storage_path);
    if (error || !data) continue;
    const extension = photo.storage_path.split(".").pop() || "jpg";
    archive.file(`photos/${String(index + 1).padStart(4, "0")}-${photo.id}.${extension}`, await data.arrayBuffer());
  }
  const zip = await archive.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return fileResponse(zip, "application/zip", `${event.slug}-${photosOnly ? "fotos" : "export"}.zip`);
}
