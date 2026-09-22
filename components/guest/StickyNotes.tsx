"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type FontStyle = "serif" | "script" | "clean" | "elegant" | "bold";
type Message = { id: string; guest_name: string | null; text: string; created_at: string; isMine: boolean; font_style?: FontStyle };

function getVisitorId() {
  const stored = window.localStorage.getItem("oan-visitor-id");
  if (stored) return stored;
  const visitorId = crypto.randomUUID();
  window.localStorage.setItem("oan-visitor-id", visitorId);
  return visitorId;
}

export function StickyNotes({ slug, messages, locale }: { slug: string; messages: Message[]; locale: string }) {
  const t = useTranslations("guest");
  const [items, setItems] = useState(messages);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editFont, setEditFont] = useState<FontStyle>("serif");

  async function updateMessage(id: string) {
    setBusy(id);
    const response = await fetch(`/api/events/${slug}/messages/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: draft, visitorId: getVisitorId(), fontStyle: editFont }) });
    if (response.ok) { setItems((current) => current.map((message) => message.id === id ? { ...message, text: draft.trim(), font_style: editFont } : message)); setEditing(null); } else setError(t("messageActionError"));
    setBusy(null);
  }

  async function deleteMessage(id: string) {
    setBusy(id);
    const response = await fetch(`/api/events/${slug}/messages/${id}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ visitorId: getVisitorId() }) });
    if (response.ok) setItems((current) => current.filter((message) => message.id !== id)); else setError(t("messageActionError"));
    setBusy(null);
  }

  if (items.length === 0) return <p className="rounded-3xl border border-dashed border-[var(--coral)]/40 bg-white/50 px-5 py-10 text-center text-lg text-[var(--muted)]">{t("noMessages")}</p>;
  return <><div className="grid items-start gap-5 sm:grid-cols-2">{items.map((message, index) => <article key={message.id} className={`sticky-note sticky-note-${index % 3} message-font-${message.font_style || "serif"}`}><div>{editing === message.id ? <><textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={500} className="min-h-28 w-full resize-none border-b border-[var(--ink)]/25 bg-transparent text-2xl leading-tight outline-none" /><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">{(["serif", "script", "clean", "elegant", "bold"] as FontStyle[]).map((style) => <button key={style} type="button" onClick={() => setEditFont(style)} className={`font-option font-option-${style} ${editFont === style ? "font-option-active" : ""}`}>{t(`font${style[0].toUpperCase()}${style.slice(1)}`)}</button>)}</div></> : <p className="text-2xl leading-tight">“{message.text}”</p>}</div><footer className="mt-7 flex flex-wrap items-center justify-between gap-3 font-sans text-xs text-[var(--ink)]/65"><span>{message.guest_name || t("guestName")}</span><time dateTime={message.created_at}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(message.created_at))}</time></footer>{message.isMine && <div className="mt-5 flex gap-2 font-sans text-xs"><button type="button" onClick={() => { setEditing(editing === message.id ? null : message.id); setDraft(message.text); setEditFont(message.font_style || "serif"); }} className="rounded-full bg-white/65 px-3 py-2 text-[var(--ink)]">{editing === message.id ? t("cancel") : t("editMessage")}</button>{editing === message.id ? <button type="button" disabled={busy === message.id} onClick={() => void updateMessage(message.id)} className="rounded-full bg-[var(--coral)] px-3 py-2 font-semibold text-white">{t("saveMessage")}</button> : <button type="button" disabled={busy === message.id} onClick={() => void deleteMessage(message.id)} className="rounded-full bg-white/65 px-3 py-2 text-[var(--coral)]">{t("deleteMessage")}</button>}</div>}</article>)}</div>{error && <p className="mt-5 font-sans text-sm text-[var(--coral)]">{error}</p>}</>;
}
