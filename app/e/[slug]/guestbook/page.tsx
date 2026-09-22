import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { GuestClient } from "@/components/guest/GuestClient";
import { StickyNotes } from "@/components/guest/StickyNotes";
import { getPublicEvent, getPublicMessages } from "@/lib/events";

export default async function GuestbookPage({ params }: PageProps<"/e/[slug]/guestbook">) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  const locale = event?.language ?? "de";
  const t = await getTranslations({ locale, namespace: "guest" });
  if (!event) return <main className="flex min-h-screen items-center justify-center p-6 text-center"><p>{t("expired")}</p></main>;
  const messages = await getPublicMessages(event.id);
  return <main className="min-h-screen" style={{ background: event.theme.backgroundColor ?? "var(--paper)", "--coral": event.theme.primaryColor ?? "#d97963" } as React.CSSProperties}><header className="mx-auto flex max-w-2xl items-center justify-between px-5 py-6"><Link href={`/e/${slug}`} className="brand-script">OAn</Link><Link href={`/e/${slug}/wall`} className="soft-button soft-button-outline">{t("photoWall")}</Link></header><section className="mx-auto max-w-2xl px-5 pb-8 pt-8 text-center"><p className="eyebrow">{t("guestbookLabel")}</p><p className="mx-auto mt-5 max-w-md text-xl leading-relaxed text-[var(--ink)]">{t("guestbookBody")}</p></section><GuestClient slug={slug} /><section className="mx-auto max-w-2xl px-5 pb-10"><div className="mb-5 flex items-end justify-between"><h2 className="text-3xl">{t("notesTitle")}</h2><Link href={`/e/${slug}`} className="soft-button soft-button-sage">{t("startPage")}</Link></div><StickyNotes slug={slug} messages={messages} locale={locale} /></section></main>;
}