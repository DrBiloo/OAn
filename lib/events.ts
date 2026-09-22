import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import { cookies } from "next/headers";

export type EventTheme = {
  primaryColor?: string;
  backgroundColor?: string;
  coverImagePath?: string;
};

export type EventRecord = {
  id: string;
  owner_id: string | null;
  slug: string;
  title: string;
  event_date: string | null;
  language: "de" | "tr";
  theme: EventTheme;
  plan: "free" | "paid";
  expires_at: string | null;
  created_at: string;
};

export async function getGuestLocale(event: Pick<EventRecord, "language"> | null) {
  const override = (await cookies()).get("oan_locale")?.value;
  if (override === "de" || override === "tr") return override;
  return event?.language ?? "de";
}

export async function getPublicEvent(slug: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (slug !== "demo") return null;
    return { id: "demo", owner_id: null, slug: "demo", title: "Mira & Deniz", language: "de", event_date: "2026-09-26", theme: { primaryColor: "#c96f5c", backgroundColor: "#f8f3ec" }, plan: "free", expires_at: new Date(Date.now() + 86400000).toISOString(), created_at: new Date().toISOString() } as EventRecord;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data as EventRecord | null;
}

export async function getPublicPhotos(eventId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || eventId === "demo") return [];
  const admin = createAdminClient();
  const { data } = await admin.from("photos").select("id, guest_name, thumb_path").eq("event_id", eventId).eq("hidden", false).order("created_at", { ascending: false });
  return Promise.all((data ?? []).map(async (photo) => ({ ...photo, url: (await admin.storage.from("event-photos").createSignedUrl(photo.thumb_path, 3600)).data?.signedUrl ?? "" })));
}

export async function getPublicMessages(eventId: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || eventId === "demo") return [];
  const admin = createAdminClient();
  const { data } = await admin.from("messages").select("id, guest_name, text, created_at, visitor_id, font_style").eq("event_id", eventId).eq("hidden", false).order("created_at", { ascending: false });
  const visitorId = (await cookies()).get("oan_visitor_id")?.value;
  return (data ?? []).map(({ visitor_id, ...message }) => ({ ...message, isMine: Boolean(visitorId && visitor_id === visitorId) }));
}

export async function getWallItems(slug: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("id").eq("slug", slug).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!event) return [];
  const [{ data: photos }] = await Promise.all([
    admin.from("photos").select("id, guest_name, thumb_path, created_at, view_count, like_count").eq("event_id", event.id).eq("hidden", false).eq("show_on_wall", true).order("created_at", { ascending: false }),
  ]);
  const photoItems = await Promise.all((photos ?? []).map(async (photo) => ({ id: photo.id, kind: "photo" as const, guest_name: photo.guest_name, url: (await admin.storage.from("event-photos").createSignedUrl(photo.thumb_path, 3600)).data?.signedUrl ?? "", created_at: photo.created_at, view_count: photo.view_count ?? 0, like_count: photo.like_count ?? 0 })));
  return photoItems;
}
