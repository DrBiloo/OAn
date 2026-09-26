"use client";

import { useState } from "react";

type Labels = { button: string; password: string; submit: string; loading: string; wrongPassword: string; rateLimited: string; error: string };

export function DemoExportButton({ slug, labels }: { slug: string; labels: Labels }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${slug}/export`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      if (!response.ok) {
        setError(response.status === 401 ? labels.wrongPassword : response.status === 429 ? labels.rateLimited : labels.error);
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug}-export.zip`;
      link.click();
      URL.revokeObjectURL(url);
      setPassword("");
      setOpen(false);
    } catch {
      setError(labels.error);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className="mx-auto mt-8 block font-sans text-xs text-[var(--muted)] underline underline-offset-4">{labels.button}</button>;

  return <form onSubmit={download} className="mx-auto mt-8 grid max-w-sm gap-2">
    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={labels.password} autoFocus required className="rounded-full border border-black/10 bg-white/80 px-5 py-3 text-center font-sans text-sm" />
    <button type="submit" disabled={loading || !password} className="soft-button soft-button-outline py-3 text-sm disabled:opacity-50">{loading ? labels.loading : labels.submit}</button>
    {error && <p className="font-sans text-xs text-red-600">{error}</p>}
  </form>;
}
