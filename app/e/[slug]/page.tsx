import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { GuestLocaleSwitch } from "@/components/guest/GuestLocaleSwitch";
import { getGuestLocale, getPublicEvent } from "@/lib/events";

export default async function GuestPage({ params }: PageProps<"/e/[slug]">) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  const locale = await getGuestLocale(event);
  const t = await getTranslations({ locale, namespace: "guest" });
  if (!event) return <main className="flex min-h-screen items-center justify-center p-6 text-center"><p>{t("expired")}</p></main>;
  const eventDate = event.event_date ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(`${event.event_date}T12:00:00`)) : null;
  const coverImage = event.theme.coverImagePath;
  return <main className="min-h-screen" style={{ background: event.theme.backgroundColor ?? "var(--paper)", "--coral": event.theme.primaryColor ?? "#d97963" } as React.CSSProperties}>
    <header className="mx-auto flex max-w-2xl items-center justify-between px-5 py-6"><Link href={`/e/${slug}`} className="brand-script">O<span className="text-red-600">♥</span>An</Link><GuestLocaleSwitch locale={locale} /></header>
    <section className="mx-auto max-w-2xl px-5 pb-16 pt-7 text-center"><div className="mx-auto mb-7 aspect-square w-52 overflow-hidden rounded-full border-8 border-white/75 bg-[var(--sage)] shadow-[0_20px_55px_rgba(36,49,45,0.14)]" style={coverImage ? { backgroundImage: `url(${coverImage})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}><div className="flex h-full items-end justify-center bg-gradient-to-t from-black/25 to-transparent p-5"><span className="font-sans text-[10px] uppercase tracking-[0.25em] text-white">{t("couplePhoto")}</span></div></div><p className="eyebrow">{t("welcome")}</p><h1 className="mt-4 whitespace-nowrap text-5xl leading-none tracking-tight md:text-7xl">{event.title}</h1>{eventDate && <p className="mt-5 text-xl text-[var(--muted)]">{eventDate}</p>}<p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-[var(--muted)]">{t("startBody")}</p><nav className="mx-auto mt-10 grid max-w-sm gap-3"><Link href={`/e/${slug}/guestbook`} className="soft-button soft-button-sage py-4 text-sm">{t("guestbookTab")}</Link><Link href={`/e/${slug}/wall`} className="soft-button soft-button-outline py-4 text-sm">{t("photoWall")}</Link></nav></section>
  </main>;
}
