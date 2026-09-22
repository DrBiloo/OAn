import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/supabase/auth";

async function createEvent(formData: FormData) {
  "use server";
  const title = String(formData.get("title") || "").trim();
  const language = String(formData.get("language") || "de");
  const primaryColor = String(formData.get("primaryColor") || "#d97963");
  const backgroundColor = String(formData.get("backgroundColor") || "#fbfaf6");
  const eventDate = String(formData.get("eventDate") || "") || null;
  const coverImagePath = String(formData.get("coverImagePath") || "").trim() || null;
  const { supabase, user } = await requireUser(String(formData.get("locale") || "de"));
  if (!title) return;
  const slug = `${title.toLocaleLowerCase(language).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 6)}`;
  const { data } = await supabase.from("events").insert({ owner_id: user.id, title, slug, language, event_date: eventDate, theme: { primaryColor, backgroundColor, coverImagePath } }).select("id").single();
  if (data) redirect(`/${language}/dashboard/events/${data.id}`);
}

export default async function NewEventPage({ params }: PageProps<"/[locale]/dashboard/events/new">) {
  const { locale } = await params;
  const t = await getTranslations("event");
  await requireUser(locale);
  return <main className="min-h-screen px-6 py-8 md:px-12"><Link href={`/${locale}/dashboard`} className="font-sans text-sm">← {t("back")}</Link><section className="mx-auto max-w-xl pt-16"><h1 className="text-6xl">{t("newTitle")}</h1><form action={createEvent} className="mt-10 space-y-6"><input type="hidden" name="locale" value={locale} /><label className="block font-sans text-sm">{t("titleLabel")}<input name="title" required className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-3 outline-none" /></label><label className="block font-sans text-sm">{t("dateLabel")}<input name="eventDate" type="date" className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-3 outline-none" /></label><label className="block font-sans text-sm">{t("coverLabel")}<input name="coverImagePath" type="url" placeholder="https://..." className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-3 outline-none" /></label><label className="block font-sans text-sm">{t("language")}<select name="language" defaultValue={locale} className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-3"><option value="de">Deutsch</option><option value="tr">Türkçe</option></select></label><div className="grid grid-cols-2 gap-4"><label className="font-sans text-sm">{t("primary")}<input name="primaryColor" className="mt-2 h-12 w-full" type="color" defaultValue="#d97963" /></label><label className="font-sans text-sm">{t("background")}<input name="backgroundColor" className="mt-2 h-12 w-full" type="color" defaultValue="#fbfaf6" /></label></div><button type="submit" className="rounded-full bg-[var(--ink)] px-7 py-3 font-sans text-sm text-white">{t("create")}</button></form></section></main>;
}
