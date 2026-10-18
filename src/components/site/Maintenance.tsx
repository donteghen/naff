import { getTranslator } from "@/i18n/server";
import { IconSettings } from "../Icons";
import { Logo } from "../Logo";
import { CallUsButton } from "./CallUsButton";

export async function Maintenance() {
  const { t } = await getTranslator();
  return (
    <main className="flex flex-1 flex-col items-center gap-4 p-8 text-center">
      <Logo size={30} />
      <div className="mt-10 flex h-24 w-24 items-center justify-center rounded-full bg-amber text-navy"><IconSettings size={44} /></div>
      <h1 className="text-2xl font-extrabold">{t("site.maintenanceTitle")}</h1>
      <p className="text-muted">{t("site.maintenanceBody")}</p>
      <div className="mt-auto w-full"><CallUsButton /></div>
    </main>
  );
}
