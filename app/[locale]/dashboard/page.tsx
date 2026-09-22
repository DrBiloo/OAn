import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/supabase/auth";

export default async function DashboardPage({ params }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");
  const { supabase } = await requireUser(locale);
  const { data: events } = await supabase.from("events").select("id, title, slug, expires_at").order("created_at", { ascending: false });
  return <main className="min-h-screen px-6 py-8 md:px-12"><header className="flex items-center justify-between font-sans"><Link href={`/${locale}`} className="font-bold">O<span className="text-red-600">♥</span>An.</Link><Link className="rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-white" href={`/${locale}/dashboard/events/new`}>+ {t("new")}</Link></header><section className="mx-auto max-w-4xl pt-20"><h1 className="text-6xl">{t("title")}</h1>{events?.length ? <div className="mt-12 grid gap-4 md:grid-cols-2">{events.map((event) => <Link key={event.id} href={`/${locale}/dashboard/events/${event.id}`} className="rounded-3xl border border-[var(--line)] bg-white/50 p-6"><p className="font-sans text-xs uppercase tracking-widest text-[var(--muted)]">/{event.slug}</p><h2 className="mt-3 text-3xl">{event.title}</h2><p className="mt-8 font-sans text-sm text-[var(--coral)]">{t("open")} →</p></Link>)}</div> : <p className="mt-12 text-xl text-[var(--muted)]">{t("empty")}</p>}</section></main>;
}
