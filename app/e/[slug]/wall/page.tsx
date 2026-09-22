import { getTranslations } from "next-intl/server";
import { WallClient } from "@/components/guest/WallClient";
import { getGuestLocale, getPublicEvent, getWallItems } from "@/lib/events";
import Link from "next/link";

export default async function WallPage({ params }: PageProps<"/e/[slug]/wall">) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  const locale = await getGuestLocale(event);
  const t = await getTranslations({ locale, namespace: "wall" });
  if (!event) return <main className="flex min-h-screen items-center justify-center p-6 text-center"><p>{t("empty")}</p></main>;
  const initialItems = await getWallItems(slug);
  return <div style={{ "--wall-background": event.theme.backgroundColor ?? "var(--paper)", "--coral": event.theme.primaryColor ?? "#d97963" } as React.CSSProperties}><Link href={`/e/${slug}`} className="fixed bottom-5 left-5 z-20 soft-button soft-button-outline bg-white/85 shadow-sm backdrop-blur-md">{t("backToStart")}</Link><WallClient slug={slug} eventId={event.id} locale={locale} initialItems={initialItems} /></div>;
}
