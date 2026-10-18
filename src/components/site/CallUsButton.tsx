import { getTranslator } from "@/i18n/server";
import { getSettings } from "@/server/services/settings";
import { IconPhone } from "../Icons";
import { buttonClass } from "../ui";

/** Big "Call us" button. Hidden when no number is set in Settings. */
export async function CallUsButton({ className = "" }: { className?: string }) {
  const { t } = await getTranslator();
  const settings = await getSettings();
  if (!settings.callUsPhone) return null;
  return (
    <a href={`tel:+237${settings.callUsPhone}`} className={buttonClass("action", "lg", `w-full ${className}`)}>
      <IconPhone size={20} />
      {t("site.callUs")}
    </a>
  );
}
