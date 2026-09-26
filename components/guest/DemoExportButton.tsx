"use client";

import { useState } from "react";

type Kind = "photos" | "guestbook";
type Labels = { photos: string; guestbook: string; password: string; submit: string; loading: string; cancel: string; wrongPassword: string; rateLimited: string; error: string };

export function DemoExportButton({ slug, labels }: { slug: string; labels: Labels }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function choose(next: Kind | null) {
    setKind(next);
    setError(null);
  }

  async function download(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${slug}/export`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, kind }) });
      if (!response.ok) {
        setError(response.status === 401 ? labels.wrongPassword : response.status === 429 ? labels.rateLimited : labels.error);
        return;
      }
      const filename = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `${slug}-export`;
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setPassword("");
      setKind(null);
    } catch {
      setError(labels.error);
    } finally {
      setLoading(false);
    }
  }

  if (!kind) return <div className="mx-auto mt-8 flex max-w-sm justify-center gap-6 font-sans text-xs text-[var(--muted)]">
    <button type="button" onClick={() => choose("guestbook")} className="underline underline-offset-4">{labels.guestbook}</button>
    <button type="button" onClick={() => choose("photos")} className="underline underline-offset-4">{labels.photos}</button>
  </div>;

  return <form onSubmit={download} className="mx-auto mt-8 grid max-w-sm gap-2">
    <p className="font-sans text-xs text-[var(--muted)]">{kind === "guestbook" ? labels.guestbook : labels.photos}</p>
    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={labels.password} autoFocus required className="rounded-full border border-black/10 bg-white/80 px-5 py-3 text-center font-sans text-sm" />
    <button type="submit" disabled={loading || !password} className="soft-button soft-button-outline py-3 text-sm disabled:opacity-50">{loading ? labels.loading : labels.submit}</button>
    <button type="button" onClick={() => choose(null)} disabled={loading} className="font-sans text-xs text-[var(--muted)] underline underline-offset-4">{labels.cancel}</button>
    {error && <p className="font-sans text-xs text-red-600">{error}</p>}
  </form>;
}
