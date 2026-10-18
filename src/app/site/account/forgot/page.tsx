import { SiteHeader } from "@/components/site/SiteHeader";
import { ForgotPinForm } from "@/components/site/ForgotPinForm";
import { getTranslator } from "@/i18n/server";

export default async function ForgotPinPage() {
  const { t } = await getTranslator();
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-6 pb-8">
        <h1 className="text-[28px] font-extrabold">{t("site.forgotPinTitle")}</h1>
        <p className="text-sm text-muted">{t("site.forgotPinIntro")}</p>
        <ForgotPinForm />
      </main>
    </>
  );
}
