import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/supabase/auth";

async function deleteEvent(formData: FormData) {
  "use server";
  const locale = String(formData.get("locale") || "de");
  const id = String(formData.get("id") || "");
  const { supabase } = await requireUser(locale);
  await supabase.from("events").delete().eq("id", id);
  redirect(`/${locale}/dashboard`);
}

export default async function EventDetailsPage({ params }: PageProps<"/[locale]/dashboard/events/[id]">) {
  const { locale, id } = await params;
  const t = await getTranslations("event");
  const { supabase } = await requireUser(locale);
  const { data: event } = await supabase.from("events").select("id, slug, title").eq("id", id).single();
  if (!event) return <main className="p-8">{t("details")}</main>;
  const guestUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/e/${event.slug}`;
  const qrData = await QRCode.toDataURL(guestUrl, { width: 720, margin: 2, color: { dark: "#24312d", light: "#fbfaf6" } });
  const [{ data: photos }, { data: messages }] = await Promise.all([supabase.from("photos").select("id, guest_name, hidden, show_on_wall, created_at").eq("event_id", id).order("created_at", { ascending: false }), supabase.from("messages").select("id, guest_name, text, hidden, created_at").eq("event_id", id).order("created_at", { ascending: false })]);
  return <main className="min-h-screen px-6 py-8 md:px-12"><Link href={`/${locale}/dashboard`} className="font-sans text-sm">← {t("back")}</Link><section className="mx-auto max-w-5xl pt-12"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="font-sans text-xs uppercase tracking-[0.3em] text-[var(--coral)]">/{event.slug}</p><h1 className="mt-3 text-6xl">{event.title}</h1></div><div className="flex flex-wrap gap-3 font-sans text-sm"><a className="rounded-full border border-[var(--ink)] px-5 py-3" href={`/e/${event.slug}/wall`} target="_blank">{t("wall")}</a><a className="rounded-full border border-[var(--ink)] px-5 py-3" href={`/api/host/events/${id}/export`}>{t("export")}</a><a className="rounded-full bg-[var(--ink)] px-5 py-3 text-white" download="oan-qr.png" href={qrData}>{t("download")}</a><form action={deleteEvent}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="id" value={id} /><button className="rounded-full border border-[var(--coral)] px-5 py-3 text-[var(--coral)]" type="submit">{t("deleteEvent")}</button></form></div></div><div className="mt-12 grid gap-10 md:grid-cols-[280px_1fr]"><div className="rounded-3xl bg-white p-5 shadow-sm"><Image src={qrData} alt={event.title} width={720} height={720} unoptimized className="w-full" /><p className="mt-3 break-all text-center font-sans text-xs text-[var(--muted)]">{guestUrl}</p></div><div><h2 className="text-3xl">{t("moderation")}</h2><div className="mt-6 space-y-3">{messages?.map((message) => <article key={message.id} className="rounded-2xl border border-[var(--line)] bg-white/50 p-4"><p className="text-lg">{message.text}</p><p className="mt-2 font-sans text-xs text-[var(--muted)]">{message.guest_name || ""}</p><form action={`/api/host/events/${id}/messages/${message.id}`} method="post" className="mt-3 flex gap-3 font-sans text-xs"><button name="action" value={message.hidden ? "show" : "hide"}>{message.hidden ? t("show") : t("hide")}</button><button name="action" value="delete" className="text-[var(--coral)]">{t("delete")}</button></form></article>)}{photos?.map((photo) => <article key={photo.id} className="rounded-2xl border border-[var(--line)] bg-white/50 p-4 font-sans text-sm"><p>{photo.guest_name || ""}</p><form action={`/api/host/events/${id}/photos/${photo.id}`} method="post" className="mt-3 flex gap-3 text-xs"><button name="action" value={photo.hidden ? "show" : "hide"}>{photo.hidden ? t("show") : t("hide")}</button><button name="action" value={photo.show_on_wall ? "removeWall" : "showWall"}>{photo.show_on_wall ? t("removeWall") : t("show")}</button><button name="action" value="delete" className="text-[var(--coral)]">{t("delete")}</button></form></article>)}</div></div></div></section></main>;
}
