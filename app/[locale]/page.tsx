import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitch } from "@/components/LocaleSwitch";

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const t = await getTranslations("landing");
  return <main className="min-h-screen overflow-hidden px-6 py-6 md:px-12">
    <header className="flex items-center justify-between font-sans"><strong className="text-xl tracking-tight">OAn<span className="text-[var(--coral)]">.</span></strong><LocaleSwitch locale={locale} href="" /></header>
    <section className="mx-auto grid max-w-6xl items-center gap-12 pb-16 pt-24 md:grid-cols-[1.15fr_.85fr] md:pt-36">
      <div><p className="mb-6 font-sans text-xs font-bold uppercase tracking-[0.3em] text-[var(--coral)]">{t("eyebrow")}</p><h1 className="max-w-3xl text-6xl leading-[.95] tracking-tight md:text-8xl">{t("title")}</h1><p className="mt-8 max-w-lg text-xl leading-relaxed text-[var(--muted)]">{t("body")}</p><div className="mt-10 flex flex-wrap gap-3 font-sans text-sm"><Link className="rounded-full bg-[var(--ink)] px-6 py-3 text-white" href={`/${locale}/login`}>{t("host")}</Link><Link className="rounded-full border border-[var(--ink)] px-6 py-3" href="/e/demo">{t("guest")}</Link></div></div>
      <div className="relative aspect-square rounded-[3rem] bg-[var(--sage)] p-8"><div className="absolute inset-8 rounded-[2.3rem] border border-white/70" /><div className="absolute bottom-12 left-12 right-12 rounded-3xl bg-[var(--paper)] p-6 shadow-xl"><p className="font-sans text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Mira & Deniz</p><p className="mt-2 text-3xl">{t("wall")}</p><div className="mt-5 h-2 rounded-full bg-[var(--coral)]" /></div></div>
    </section>
  </main>;
}
