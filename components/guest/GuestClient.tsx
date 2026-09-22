"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

type FontStyle = "serif" | "script" | "clean" | "elegant" | "bold";

export function GuestClient({ slug }: { slug: string }) {
  const t = useTranslations("guest");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [fontStyle, setFontStyle] = useState<FontStyle>("serif");
  const [notice, setNotice] = useState("");

  function getVisitorId() {
    const stored = window.localStorage.getItem("oan-visitor-id");
    if (stored) return stored;
    const visitorId = crypto.randomUUID();
    window.localStorage.setItem("oan-visitor-id", visitorId);
    return visitorId;
  }

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    if (!message.trim()) return;
    const response = await fetch(`/api/events/${slug}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: message, guestName: name, visitorId: getVisitorId(), fontStyle }) });
    if (!response.ok) { setNotice(t("messageActionError")); return; }
    setMessage("");
    setNotice(t("success"));
  }

  return <section className="mx-auto max-w-xl px-5 pb-12 pt-8">
    <form onSubmit={submitMessage} className="rounded-[2rem] border border-[var(--coral)]/15 bg-white/55 p-5 shadow-[0_16px_40px_rgba(36,49,45,0.06)]">
      <label className="mb-2 block font-sans text-sm text-[var(--muted)]">{t("name")}</label>
      <input value={name} onChange={(event) => setName(event.target.value)} className="mb-5 w-full border-b border-[var(--line)] bg-transparent px-0 py-3 outline-none" />
      <label className="mb-2 block font-sans text-sm text-[var(--muted)]">{t("message")}</label>
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} placeholder={t("messagePlaceholder")} className={`message-input message-input-${fontStyle} min-h-36 w-full resize-none rounded-2xl border border-[var(--line)] bg-white/65 p-4 outline-none`} />
      <div className="mt-5"><p className="mb-2 font-sans text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{t("fontChoice")}</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{(["serif", "script", "clean", "elegant", "bold"] as FontStyle[]).map((style) => <button key={style} type="button" onClick={() => setFontStyle(style)} className={`font-option font-option-${style} ${fontStyle === style ? "font-option-active" : ""}`}>{t(`font${style[0].toUpperCase()}${style.slice(1)}`)}</button>)}</div></div>
      <button className="mt-6 w-full rounded-full bg-[var(--coral)] px-6 py-3 font-sans text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5" type="submit">{t("send")}</button>
    </form>
    {notice && <p className="mt-5 text-center font-sans text-sm text-[var(--coral)]">{notice}</p>}
  </section>;
}
