import Link from "next/link";

export function LocaleSwitch({ locale, href }: { locale: string; href: string }) {
  const target = locale === "de" ? "tr" : "de";
  return <Link className="font-sans text-xs font-bold tracking-widest" href={`/${target}${href}`}>{target.toLocaleUpperCase(target)}</Link>;
}
