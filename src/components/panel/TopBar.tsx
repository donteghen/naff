import Link from "next/link";
import { getTranslator } from "@/i18n/server";
import { config } from "@/server/config";
import { IconPlus } from "../Icons";
import { LanguageSwitch } from "../LanguageSwitch";
import { buttonClass } from "../ui";
import { LiveAlerts } from "./LiveAlerts";

export async function TopBar({ maintenance }: { maintenance: boolean }) {
  const { t } = await getTranslator();
  return (
    <>
      {maintenance && (
        <div className="bg-amber px-4 py-2 text-center text-sm font-extrabold text-navy">
          {t("panel.maintenanceBanner")} · <Link href="/settings?tab=status" className="underline">{t("nav.settings")}</Link>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2 px-4 pt-4 md:px-6 lg:px-8">
        <Link href="/quick-order" className={buttonClass("action", "sm", "mr-auto md:mr-0")}><IconPlus size={16} />{t("panel.quickOrder")}</Link>
        <LiveAlerts ablyConfigured={config.ablyConfigured()} fallbackToRefresh={config.fallbackToRefresh()} refreshSeconds={config.refreshSeconds()} />
        <span className="hidden md:inline-flex"><LanguageSwitch /></span>
      </div>
    </>
  );
}
