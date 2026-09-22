"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";

type Photo = { id: string; url: string; guest_name: string | null };

function getVisitorId() {
  const stored = window.localStorage.getItem("oan-visitor-id");
  if (stored) return stored;
  const visitorId = crypto.randomUUID();
  window.localStorage.setItem("oan-visitor-id", visitorId);
  return visitorId;
}

export function PhotoGallery({ slug, photos }: { slug: string; photos: Photo[] }) {
  const t = useTranslations("guest");
  const [items, setItems] = useState(photos);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function removePhoto(photoId: string) {
    setDeleting(photoId);
    setError("");
    const response = await fetch(`/api/events/${slug}/photos/${photoId}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ visitorId: getVisitorId() }) });
    if (response.ok) setItems((current) => current.filter((photo) => photo.id !== photoId));
    else setError(t("deleteError"));
    setDeleting(null);
  }

  return <section id="gallery" className="mx-auto max-w-2xl scroll-mt-16 px-5 pb-16"><div className="mb-5 flex items-end justify-between gap-4"><h2 className="text-3xl">{t("gallery")}</h2><span className="font-sans text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{items.length}</span></div>{items.length === 0 ? <p className="rounded-3xl border border-dashed border-[var(--coral)]/50 bg-white/45 px-5 py-10 text-center text-lg text-[var(--muted)]">{t("empty")}</p> : <div className="grid grid-cols-2 gap-3">{items.map((photo) => <article key={photo.id} className="group relative overflow-hidden rounded-2xl bg-white shadow-sm"><Image src={photo.url} alt={photo.guest_name || ""} width={800} height={800} unoptimized className="aspect-square w-full object-cover" /><button type="button" onClick={() => void removePhoto(photo.id)} disabled={deleting === photo.id} aria-label={t("deletePhoto")} className="absolute bottom-2 right-2 rounded-full bg-white/90 px-3 py-2 font-sans text-xs font-semibold text-[var(--coral)] shadow-sm backdrop-blur-sm transition-colors hover:bg-[var(--coral)] hover:text-white disabled:opacity-50">{deleting === photo.id ? "..." : t("deletePhoto")}</button></article>)}</div>}{error && <p className="mt-4 font-sans text-sm text-[var(--coral)]">{error}</p>}</section>;
}
