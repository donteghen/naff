import Link from "next/link";
import { getTranslator } from "@/i18n/server";
import { LanguageSwitch } from "../LanguageSwitch";
import { Logo } from "../Logo";

export async function DriverHeader({ available }: { available: boolean }) {
  const { t } = await getTranslator();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-navy px-4 py-3">
      <Link href="/" aria-label="NAFF"><Logo onDark size={24} /></Link>
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${available ? "bg-green-tint text-green-ink" : "bg-navy-soft text-side-text"}`}>
          ● {available ? t("driver.available") : t("driver.offline")}
        </span>
        <LanguageSwitch onDark />
      </div>
    </header>
  );
}
