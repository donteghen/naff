import { ButtonLink, Card } from "@/components/ui";
import { getTranslator } from "@/i18n/server";

export default async function PanelNotFound() {
  const { t } = await getTranslator();
  return (
    <Card className="flex flex-col items-center gap-4 p-10 text-center">
      <h1 className="text-2xl font-extrabold">{t("common.notFoundTitle")}</h1>
      <p className="text-muted">{t("common.notFoundBody")}</p>
      <ButtonLink href="/" variant="primary" size="md">{t("nav.dashboard")}</ButtonLink>
    </Card>
  );
}
