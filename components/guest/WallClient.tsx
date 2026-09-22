"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/browser";

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

function getVisitorId() {
  const stored = window.localStorage.getItem("oan-visitor-id");
  if (stored) return stored;
  const visitorId = crypto.randomUUID();
  window.localStorage.setItem("oan-visitor-id", visitorId);
  return visitorId;
}

export function WallClient({ slug, eventId, locale, initialItems }: { slug: string; eventId: string; locale: string; initialItems: WallItem[] }) {
  const t = useTranslations("wall");
  const [items, setItems] = useState(initialItems);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const viewed = useRef(new Set<string>());

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) return;
    const supabase = createClient();
    const refresh = () => fetch(`/api/events/${slug}/wall`, { cache: "no-store" }).then((response) => response.ok ? response.json() as Promise<WallItem[]> : []).then(setItems);
    const channel = supabase.channel(`wall-${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "photos", filter: `event_id=eq.${eventId}` }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `event_id=eq.${eventId}` }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [eventId, slug]);

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
    const response = await fetch(`/api/events/${slug}/photos/${itemId}/react`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "like", visitorId }) });
    if (!response.ok) return;
    const result = await response.json() as { liked: boolean; likeCount: number };
    setLikes((current) => ({ ...current, [itemId]: result.liked }));
    setItems((current) => current.map((item) => item.id === itemId ? { ...item, like_count: result.likeCount } : item));
  }

  const formatTime = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  return <main className="min-h-screen px-4 pb-12 pt-20" style={{ background: "var(--wall-background, var(--paper))" }}>
    <header className="fixed left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-black/5 bg-[var(--wall-background,var(--paper))]/90 px-5 py-3 backdrop-blur-md">
      <span className="brand-script" aria-label="OAn">OAn</span>
      <span className="font-sans text-xs font-bold uppercase tracking-[0.25em] text-[var(--coral)]">{t("live")}</span>
    </header>
    <section className="mx-auto max-w-xl"><p className="mb-8 text-center text-4xl leading-[.95] tracking-tight md:text-6xl">{t("title")}</p>
      {items.length === 0 && <p className="py-20 text-center text-xl text-[var(--muted)]">{t("empty")}</p>}
      <div className="space-y-7">{items.map((item) => item.kind === "photo" && item.url ? <article key={item.id} className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_18px_50px_rgba(36,49,45,0.10)]"><Image src={item.url} alt={item.guest_name || ""} width={1600} height={1200} unoptimized className="max-h-[70vh] w-full object-cover" /><div className="px-5 pb-5 pt-4"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="truncate font-sans text-sm font-semibold">{item.guest_name || t("guest")}</p><p className="mt-1 font-sans text-xs text-[var(--muted)]">{formatTime(item.created_at)}</p></div><button type="button" aria-label={likes[item.id] ? t("unlike") : t("like")} onClick={() => void toggleLike(item.id)} className={`flex shrink-0 items-center gap-2 font-sans text-sm ${likes[item.id] ? "text-[var(--coral)]" : "text-[var(--ink)]"}`}><span className="text-2xl leading-none">{likes[item.id] ? "♥" : "♡"}</span><span>{item.like_count ?? 0}</span></button></div><p className="mt-3 font-sans text-xs text-[var(--muted)]">{item.view_count ?? 0} {t("viewed")}</p></div></article> : item.kind === "message" ? <article key={item.id} className="rounded-[1.75rem] bg-white px-6 py-8 shadow-[0_18px_50px_rgba(36,49,45,0.08)]"><blockquote className="text-3xl leading-tight">“{item.text}”</blockquote><footer className="mt-6 flex items-center justify-between gap-4 font-sans text-xs text-[var(--muted)]"><span>{item.guest_name || t("guest")}</span><span>{formatTime(item.created_at)}</span></footer></article> : null)}</div>
    </section>
  </main>;
}
