import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import deMessages from "@/messages/de.json";
import trMessages from "@/messages/tr.json";
import { getGuestLocale, getPublicEvent } from "@/lib/events";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  const locale = await getGuestLocale(event);
  const messages = locale === "tr" ? trMessages : deMessages;
  return { title: `${event?.title ?? messages.common.brand} | ${messages.common.brand}`, description: messages.common.metaDescription };
}

export default async function EventLayout({ children, params }: LayoutProps<"/e/[slug]"> & { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  const locale = await getGuestLocale(event);
  const messages = locale === "tr" ? trMessages : deMessages;
  return <NextIntlClientProvider locale={locale} messages={messages}>{children}</NextIntlClientProvider>;
}
