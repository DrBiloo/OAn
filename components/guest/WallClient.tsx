"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/browser";
import { GuestLocaleSwitch } from "@/components/guest/GuestLocaleSwitch";

type WallItem = {
  id: string;
  kind: "photo" | "message";
  text?: string;
  url?: string;
  guest_name?: string | null;
  created_at: string;
  view_count?: number;
  like_count?: number;
};

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_FILE_SIZE = 15 * 1024 * 1024;

function getVisitorId() {
  const stored = window.localStorage.getItem("oan-visitor-id");
  if (stored) return stored;
  const visitorId = crypto.randomUUID();
  window.localStorage.setItem("oan-visitor-id", visitorId);
  return visitorId;
}

async function createThumbnailBlob(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 640;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function WallClient({ slug, eventId, locale, initialItems }: { slug: string; eventId: string; locale: string; initialItems: WallItem[] }) {
  const t = useTranslations("wall");
  const [items, setItems] = useState(initialItems);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [guestName, setGuestName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [fileName, setFileName] = useState("");
  const viewed = useRef(new Set<string>());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    fetch(`/api/events/${slug}/wall`, { cache: "no-store" }).then((response) => response.ok ? response.json() as Promise<WallItem[]> : null).then((data) => { if (data) setItems(data); });
  }, [slug]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) return;
    const supabase = createClient();
    const channel = supabase.channel(`wall-${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "photos", filter: `event_id=eq.${eventId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `event_id=eq.${eventId}` }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [eventId, refresh]);

  useEffect(() => {
    const visitorId = getVisitorId();
    for (const item of items) {
      if (item.kind !== "photo" || viewed.current.has(item.id)) continue;
      viewed.current.add(item.id);
      void fetch(`/api/events/${slug}/photos/${item.id}/react`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "view", visitorId }) })
        .then((response) => response.ok ? response.json() as Promise<{ viewCount: number }> : null)
        .then((result) => { if (result) setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, view_count: result.viewCount } : entry)); });
    }
  }, [items, slug]);

  async function toggleLike(itemId: string) {
    const visitorId = getVisitorId();
    const wasLiked = likes[itemId] === true;
    setLikes((current) => ({ ...current, [itemId]: !wasLiked }));
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, like_count: Math.max(0, (item.like_count ?? 0) + (wasLiked ? -1 : 1)) } : item));
    const response = await fetch(`/api/events/${slug}/photos/${itemId}/react`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "like", visitorId }) });
    if (!response.ok) {
      setLikes((current) => ({ ...current, [itemId]: wasLiked }));
      setItems((current) => current.map((item) => item.id === itemId ? { ...item, like_count: Math.max(0, (item.like_count ?? 0) + (wasLiked ? 1 : -1)) } : item));
      return;
    }
    const result = await response.json() as { liked: boolean; likeCount: number };
    setLikes((current) => ({ ...current, [itemId]: result.liked }));
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, like_count: result.likeCount } : item));
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    setFileName(file.name);
    if (!ALLOWED_TYPES.has(file.type)) { setUploadError(t("invalidImage")); return; }
    if (file.size > MAX_FILE_SIZE) { setUploadError(t("fileTooLarge")); return; }
    setUploading(true);
    try {
      const urlResponse = await fetch(`/api/events/${slug}/upload-url`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ filename: file.name, contentType: file.type }) });
      if (urlResponse.status === 429) throw new Error("rate_limited");
      if (urlResponse.status === 413) throw new Error("limit_reached");
      if (!urlResponse.ok) throw new Error("upload_url_failed");
      const { original, thumbnail } = await urlResponse.json() as { original: { path: string; token: string }; thumbnail: { path: string; token: string } };
      const thumbBlob = await createThumbnailBlob(file);
      const supabase = createClient();
      const [originalUpload, thumbUpload] = await Promise.all([
        supabase.storage.from("event-photos").uploadToSignedUrl(original.path, original.token, file),
        supabase.storage.from("event-photos").uploadToSignedUrl(thumbnail.path, thumbnail.token, thumbBlob),
      ]);
      if (originalUpload.error || thumbUpload.error) throw new Error("storage_upload_failed");
      const registerResponse = await fetch(`/api/events/${slug}/photos`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ storagePath: original.path, thumbPath: thumbnail.path, guestName, visitorId: getVisitorId() }) });
      if (!registerResponse.ok) throw new Error("register_failed");
      refresh();
    } catch (error) {
      setUploadError(error instanceof Error && error.message === "limit_reached" ? t("limitReached") : error instanceof Error && error.message === "rate_limited" ? t("rateLimited") : t("uploadError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFileName("");
    }
  }

  const formatTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  return <main className="min-h-screen px-4 pb-12 pt-20" style={{ background: "var(--wall-background, var(--paper))" }}>
    <header className="fixed left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-black/5 bg-[var(--wall-background,var(--paper))]/90 px-5 py-3 backdrop-blur-md">
      <span className="brand-script" aria-label="OAn">O<span className="text-red-600">♥</span>An</span>
      <div className="flex items-center gap-4"><span className="font-sans text-xs font-bold uppercase tracking-[0.25em] text-[var(--coral)]">{t("live")}</span><GuestLocaleSwitch locale={locale} /></div>
    </header>
    <section className="mx-auto max-w-xl"><p className="mb-8 text-center text-4xl leading-[.95] tracking-tight md:text-6xl">{t("title")}</p>
      <div className="mb-8 rounded-[1.75rem] border border-dashed border-[var(--coral)]/40 bg-white/60 p-5">
        <p className="mb-3 font-sans text-sm font-semibold text-[var(--ink)]">{t("uploadTitle")}</p>
        <input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder={t("guest")} disabled={uploading} className="mb-3 w-full border-b border-[var(--line)] bg-transparent px-0 py-2 font-sans text-sm outline-none disabled:opacity-50" />
        <div className="flex items-center gap-3">
          <label htmlFor="wall-photo-input" className={`soft-button shrink-0 bg-[var(--coral)] py-2.5 text-white ${uploading ? "pointer-events-none opacity-50" : ""}`}>{t("chooseFile")}</label>
          <input id="wall-photo-input" ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" disabled={uploading} onChange={(event) => void handleFileSelected(event.target.files?.[0])} className="hidden" />
          <span className="truncate font-sans text-xs text-[var(--muted)]">{fileName || t("noFileChosen")}</span>
        </div>
        {uploading && <p className="mt-3 font-sans text-xs text-[var(--coral)]">{t("uploading")}</p>}
        {uploadError && <p className="mt-3 font-sans text-xs text-[var(--coral)]">{uploadError}</p>}
      </div>
      {items.length === 0 && <p className="py-20 text-center text-xl text-[var(--muted)]">{t("empty")}</p>}
      <div className="space-y-7">{items.map((item) => item.kind === "photo" && item.url ? <article key={item.id} className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_50px_rgba(36,49,45,0.10)]"><Image src={item.url} alt={item.guest_name || ""} width={1600} height={1200} unoptimized className="max-h-[70vh] w-full object-cover" /><div className="px-5 pb-5 pt-4"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="truncate font-sans text-sm font-semibold">{item.guest_name || t("guest")}</p><p className="mt-1 font-sans text-xs text-[var(--muted)]">{formatTime(item.created_at)}</p></div><button type="button" aria-label={likes[item.id] ? t("unlike") : t("like")} onClick={() => void toggleLike(item.id)} className={`flex shrink-0 items-center gap-2 font-sans text-sm ${likes[item.id] ? "text-[var(--coral)]" : "text-[var(--ink)]"}`}><span className="text-2xl leading-none">{likes[item.id] ? "♥" : "♡"}</span><span>{item.like_count ?? 0}</span></button></div><p className="mt-3 font-sans text-xs text-[var(--muted)]">{item.view_count ?? 0} {t("viewed")}</p></div></article> : item.kind === "message" ? <article key={item.id} className="rounded-[1.75rem] bg-white px-6 py-8 shadow-[0_18px_50px_rgba(36,49,45,0.08)]"><blockquote className="text-3xl leading-tight">“{item.text}”</blockquote><footer className="mt-6 flex items-center justify-between gap-4 font-sans text-xs text-[var(--muted)]"><span>{item.guest_name || t("guest")}</span><span>{formatTime(item.created_at)}</span></footer></article> : null)}</div>
    </section>
  </main>;
}
