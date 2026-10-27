import Link from "next/link";
import { getTranslator } from "@/i18n/server";
import { getCurrentUser } from "@/server/auth/current";
import { IconBox, IconUser } from "../Icons";
import { LanguageSwitch } from "../LanguageSwitch";
import { Logo } from "../Logo";
import { buttonClass } from "../ui";

/** `showSend` is off on the request page itself. */
export async function SiteHeader({ showSend = true }: { showSend?: boolean } = {}) {
  const { t } = await getTranslator();
  const user = await getCurrentUser();
  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
      <Link href="/" aria-label="NAFF">
        <span className="hidden min-[420px]:inline"><Logo size={26} /></span>
        <span className="min-[420px]:hidden"><Logo size={26} withText={false} /></span>
      </Link>
      <div className="flex items-center gap-2">
        {showSend && (
          <Link href="/request" className={buttonClass("action", "sm", "px-3")}>
            <IconBox size={18} />
            <span className="min-[420px]:hidden">{t("site.sendShort")}</span>
            <span className="hidden min-[420px]:inline">{t("landing.send")}</span>
          </Link>
        )}
        <Link
          href={user ? "/account" : "/account/login"}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-bold shadow-[var(--shadow-card)]"
        >
          <IconUser size={16} />
          <span className="max-w-24 truncate">{user ? user.name.split(" ")[0] : t("site.login")}</span>
        </Link>
        <LanguageSwitch />
      </div>
    </header>
  );
}
