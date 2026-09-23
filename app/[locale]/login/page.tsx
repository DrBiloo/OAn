import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { createClient } from "@/lib/supabase/server";

async function sendMagicLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "");
  const locale = String(formData.get("locale") || "de");
  const names = String(formData.get("names") || "").trim();
  const eventDate = String(formData.get("eventDate") || "").trim();
  const nextParams = new URLSearchParams();
  if (names) nextParams.set("title", names);
  if (eventDate) nextParams.set("eventDate", eventDate);
  const nextPath = `/${locale}/dashboard/events/new${nextParams.size ? `?${nextParams}` : ""}`;
  const confirmUrl = new URL(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/confirm`);
  confirmUrl.searchParams.set("next", nextPath);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: confirmUrl.toString() } });
  if (error) redirect(`/${locale}/login?error=${error.status === 429 ? "rate_limited" : "send_failed"}`);
  redirect(`/${locale}/login?sent=1`);
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations("auth");
  return <main className="min-h-screen">
    <header className="mx-auto flex max-w-2xl items-center justify-between px-5 py-6"><Link href={`/${locale}`} className="brand-script">O<span className="text-red-600">♥</span>An</Link><LocaleSwitch locale={locale} href="/login" /></header>
    <section className="mx-auto max-w-2xl px-5 pb-16 pt-7 text-center">
      <div className="mx-auto mb-7 aspect-square w-52 overflow-hidden rounded-full border-8 border-white/75 bg-[var(--sage)] bg-cover bg-center shadow-[0_20px_55px_rgba(36,49,45,0.14)]" style={{ backgroundImage: "url(/demo/couple.jpg)" }}><div className="flex h-full items-end justify-center bg-gradient-to-t from-black/25 to-transparent p-5"><span className="font-sans text-[10px] uppercase tracking-[0.25em] text-white">O♥An</span></div></div>
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="mt-4 text-5xl leading-none tracking-tight md:text-7xl">{t("title")}</h1>
      <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-[var(--muted)]">{t("body")}</p>
      {query.sent && <p className="mt-5 font-sans text-sm text-[var(--coral)]">{t("sent")}</p>}
      {query.error === "rate_limited" && <p className="mt-5 font-sans text-sm text-[var(--coral)]">{t("errorRateLimited")}</p>}
      {query.error === "send_failed" && <p className="mt-5 font-sans text-sm text-[var(--coral)]">{t("errorSendFailed")}</p>}
      <form action={sendMagicLink} className="mx-auto mt-10 max-w-sm space-y-5 text-left">
        <input type="hidden" name="locale" value={locale} />
        <label className="block font-sans text-sm">{t("namesLabel")}<input name="names" placeholder={t("namesPlaceholder")} className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-3 outline-none" /></label>
        <label className="block font-sans text-sm">{t("dateLabel")}<input name="eventDate" type="date" className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-3 outline-none" /></label>
        <label className="block font-sans text-sm">{t("email")}<input name="email" required type="email" className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-3 outline-none" /></label>
        <button className="soft-button soft-button-sage w-full py-4 text-sm" type="submit">{t("submit")}</button>
      </form>
      <Link className="mt-8 block text-center font-sans text-sm text-[var(--coral)]" href="/e/demo">{t("demo")}</Link>
    </section>
  </main>;
}
