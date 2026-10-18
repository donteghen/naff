import Link from "next/link";
import { getTranslator } from "@/i18n/server";
import { IconUser } from "../Icons";
import { LanguageSwitch } from "../LanguageSwitch";
import { Logo } from "../Logo";
import { buttonClass } from "../ui";

export async function LandingHeader({ loggedIn }: { loggedIn: boolean }) {
  const { t } = await getTranslator();
  const links = [
    { href: "#how", label: t("landing.navHow") },
    { href: "#towns", label: t("landing.navTowns") },
    { href: "#pay", label: t("landing.navPay") },
    { href: "#track", label: t("landing.navTrack") },
  ];
  return (
    <header className="sticky top-0 z-30 bg-navy/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] items-center gap-4 px-4 py-3 md:px-8 md:py-4">
        <Link href="/" aria-label="NAFF" className="mr-auto lg:mr-0"><Logo onDark size={28} /></Link>
        <nav className="mx-auto hidden gap-7 lg:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="font-bold text-side-text transition hover:text-white">{link.label}</a>
          ))}
        </nav>
        <LanguageSwitch onDark />
        <Link href={loggedIn ? "/home" : "/account/login"} className="inline-flex min-h-11 items-center gap-1.5 px-1 font-bold text-white" aria-label={loggedIn ? t("landing.mySpace") : t("site.login")}>
          <IconUser size={18} />
          <span className="hidden sm:inline">{loggedIn ? t("landing.mySpace") : t("site.login")}</span>
        </Link>
        <Link href="/request" className={buttonClass("action", "sm", "hidden sm:inline-flex")}>{t("landing.send")}</Link>
      </div>
    </header>
  );
}
