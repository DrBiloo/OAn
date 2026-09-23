import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleSwitch } from "@/components/LocaleSwitch";

export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const t = await getTranslations("landing");
  return <main className="min-h-screen">
    <header className="mx-auto flex max-w-2xl items-center justify-between px-5 py-6"><span className="brand-script">O<span className="text-red-600">♥</span>An</span><LocaleSwitch locale={locale} href="" /></header>
    <section className="mx-auto max-w-2xl px-5 pb-16 pt-7 text-center">
      <div className="mx-auto mb-7 aspect-square w-52 overflow-hidden rounded-full border-8 border-white/75 bg-[var(--sage)] bg-cover bg-center shadow-[0_20px_55px_rgba(36,49,45,0.14)]" style={{ backgroundImage: "url(/demo/couple.jpg)" }}><div className="flex h-full items-end justify-center bg-gradient-to-t from-black/25 to-transparent p-5"><span className="font-sans text-[10px] uppercase tracking-[0.25em] text-white">O♥An</span></div></div>
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="mt-4 text-5xl leading-none tracking-tight md:text-7xl">{t("title")}</h1>
      <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-[var(--muted)]">{t("body")}</p>
      <nav className="mx-auto mt-10 grid max-w-sm gap-3"><Link href={`/${locale}/login`} className="soft-button soft-button-sage py-4 text-sm">{t("host")}</Link><Link href="/e/demo" className="soft-button soft-button-outline py-4 text-sm">{t("guest")}</Link></nav>
    </section>
  </main>;
}
