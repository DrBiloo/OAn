"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function GuestLocaleSwitch({ locale }: { locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const target = locale === "de" ? "tr" : "de";

  function switchLocale() {
    document.cookie = `oan_locale=${target}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return <button type="button" onClick={switchLocale} disabled={pending} className="font-sans text-xs font-bold tracking-widest disabled:opacity-50">{target.toUpperCase()}</button>;
}
