import { QuickOrderForm } from "@/components/order-form/QuickOrderForm";
import { PageTitle } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { listActiveCities } from "@/server/services/places";

export default async function QuickOrderPage() {
  const { t } = await getTranslator();
  const cities = await listActiveCities();
  return (
    <>
      <PageTitle title={t("quick.title")} subtitle={t("quick.intro")} />
      <QuickOrderForm cities={cities} />
    </>
  );
}
