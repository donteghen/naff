import { Maintenance } from "@/components/site/Maintenance";
import { SiteHeader } from "@/components/site/SiteHeader";
import { RequestWizard } from "@/components/order-form/RequestWizard";
import { getCurrentUser } from "@/server/auth/current";
import { listActiveCities } from "@/server/services/places";
import { isMaintenance } from "@/server/services/settings";
import { formatPhone } from "@/lib/phone";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RequestPage() {
  if (await isMaintenance()) return <Maintenance />;
  const user = await getCurrentUser();
  if (user?.mustChangePin) redirect("/account/set-pin");
  const cities = await listActiveCities();
  return (
    <>
      <SiteHeader />
      <RequestWizard
        cities={cities}
        defaults={{ senderName: user?.name ?? "", senderPhone: user ? formatPhone(user.phone) : "", originCityId: cities.length === 1 ? cities[0].id : "" }}
      />
    </>
  );
}
