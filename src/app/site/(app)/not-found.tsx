import { SiteHeader } from "@/components/site/SiteHeader";
import { ButtonLink } from "@/components/ui";
import { getTranslator } from "@/i18n/server";

export default async function SiteNotFound() {
  const { t } = await getTranslator();
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col items-center gap-4 p-8 text-center">
        <h1 className="mt-10 text-2xl font-extrabold">{t("common.notFoundTitle")}</h1>
        <p className="text-muted">{t("common.notFoundBody")}</p>
        <ButtonLink href="/" variant="primary">{t("common.home")}</ButtonLink>
      </main>
    </>
  );
}
