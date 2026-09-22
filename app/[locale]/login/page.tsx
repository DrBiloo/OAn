import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { createClient } from "@/lib/supabase/server";

async function sendMagicLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") || "");
  const locale = String(formData.get("locale") || "de");
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/confirm?next=/${locale}/dashboard` } });
  redirect(`/${locale}/login?sent=1`);
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  const query = await searchParams;
  const t = await getTranslations("auth");
  return <main className="min-h-screen px-6 py-6"><header className="flex justify-between font-sans"><Link href={`/${locale}`}>O<span className="text-red-600">♥</span>An.</Link><LocaleSwitch locale={locale} href="/login" /></header><section className="mx-auto max-w-md pt-28"><p className="font-sans text-xs uppercase tracking-[0.3em] text-[var(--coral)]">O<span className="text-red-600">♥</span>An</p><h1 className="mt-5 text-5xl">{t("title")}</h1><p className="mt-5 text-lg text-[var(--muted)]">{t("body")}</p>{query.sent && <p className="mt-5 font-sans text-sm text-[var(--coral)]">{t("sent")}</p>}<form action={sendMagicLink} className="mt-10 space-y-5"><input type="hidden" name="locale" value={locale} /><label className="block font-sans text-sm">{t("email")}<input name="email" required type="email" className="mt-2 w-full border-b border-[var(--line)] bg-transparent py-3 outline-none" /></label><button className="w-full rounded-full bg-[var(--ink)] px-6 py-4 font-sans text-sm text-white" type="submit">{t("submit")}</button></form><Link className="mt-8 block text-center font-sans text-sm text-[var(--coral)]" href="/e/demo">{t("demo")}</Link></section></main>;
}
