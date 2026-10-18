import Link from "next/link";
import { setAdminPinAction } from "@/actions/panel-admin";
import { SetPinForm } from "@/components/auth/SetPinForm";
import { AdminsForm, AgenciesForm, CitiesForm, ContactsForm, PricingForm, StatusForm, WhatsAppPreference } from "@/components/panel/SettingsForms";
import { Card, PageTitle, SectionLabel } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { ADMIN_PIN_LENGTH } from "@/lib/constants";
import { formatPhone } from "@/lib/phone";
import { requireAdminPage } from "@/server/auth/current";
import { listAdmins } from "@/server/services/people";
import { getSettings } from "@/server/services/settings";
import { listAllAgencies, listAllCities } from "@/server/services/setup";

export const dynamic = "force-dynamic";

const TABS = ["cities", "agencies", "pricing", "contacts", "status", "admins", "me"] as const;
type Tab = (typeof TABS)[number];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const admin = await requireAdminPage();
  const { t } = await getTranslator();
  const { tab: requested } = await searchParams;
  const tabs = TABS.filter((tab) => tab !== "admins" || admin.isSuperAdmin);
  const tab: Tab = tabs.includes(requested as Tab) ? (requested as Tab) : "cities";
  const settings = await getSettings();

  let content: React.ReactNode = null;
  if (tab === "cities") content = <CitiesForm cities={await listAllCities()} />;
  if (tab === "agencies") content = <AgenciesForm agencies={await listAllAgencies()} cities={await listAllCities()} />;
  if (tab === "pricing") content = <PricingForm discountRate={settings.discountRate} />;
  if (tab === "contacts") {
    content = (
      <ContactsForm
        initial={{
          callUsPhone: settings.callUsPhone ? formatPhone(settings.callUsPhone) : "",
          whatsappPhone: settings.whatsappPhone ? formatPhone(settings.whatsappPhone) : "",
          mtnNumber: settings.mtnMomo.number ? formatPhone(settings.mtnMomo.number) : "",
          mtnName: settings.mtnMomo.name,
          orangeNumber: settings.orangeMoney.number ? formatPhone(settings.orangeMoney.number) : "",
          orangeName: settings.orangeMoney.name,
        }}
      />
    );
  }
  if (tab === "status") content = <StatusForm status={settings.operationalStatus} />;
  if (tab === "admins") content = <AdminsForm admins={await listAdmins()} />;
  if (tab === "me") {
    content = (
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <SectionLabel>{t("auth.changePin")}</SectionLabel>
          <SetPinForm action={setAdminPinAction} pinLength={ADMIN_PIN_LENGTH} requireCurrent loginPath="/login" />
        </div>
        <div className="flex flex-col gap-3">
          <SectionLabel>{t("settings.whatsappMode")}</SectionLabel>
          <WhatsAppPreference />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageTitle title={t("nav.settings")} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Link key={item} href={`/settings?tab=${item}`} className={`min-h-9 rounded-full px-3.5 py-1.5 text-[13px] font-extrabold ${tab === item ? "bg-navy text-white" : "bg-cloud text-muted"}`}>
            {t(`settings.tab.${item}`)}
          </Link>
        ))}
      </div>
      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-extrabold">{t(`settings.tab.${tab}`)}</h2>
        {content}
      </Card>
    </>
  );
}
