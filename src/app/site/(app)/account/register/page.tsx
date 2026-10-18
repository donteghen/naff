import { SiteHeader } from "@/components/site/SiteHeader";
import { RegisterForm } from "@/components/site/RegisterForm";
import { Notice } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { percent } from "@/lib/money";
import { getSettings } from "@/server/services/settings";

export default async function RegisterPage() {
  const { t } = await getTranslator();
  const settings = await getSettings();
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-6 pb-8">
        <h1 className="text-[28px] font-extrabold">{t("site.createAccount")}</h1>
        {settings.discountRate > 0 && <Notice tone="warning">{t("site.registerPerks", { rate: percent(settings.discountRate) })}</Notice>}
        <RegisterForm />
      </main>
    </>
  );
}
