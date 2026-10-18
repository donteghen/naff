import Link from "next/link";
import { AddDriver } from "@/components/panel/DriverManage";
import { IconChevron } from "@/components/Icons";
import { Avatar, Card, Chip, EmptyState, PageTitle } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { formatPhone } from "@/lib/phone";
import { load } from "@/server/debug";
import { listDriversWithJobs } from "@/server/services/order-queries";
import { listActiveCities } from "@/server/services/places";

export const dynamic = "force-dynamic";

export default async function DriversPage({ searchParams }: { searchParams: Promise<{ city?: string }> }) {
  const { t } = await getTranslator();
  const { city } = await searchParams;
  const cities = await listActiveCities();
  const drivers = await load("panel.drivers", { city }, () => listDriversWithJobs({ includeInactive: true, cityIds: city ? [city] : undefined }));
  return (
    <>
      <PageTitle title={t("nav.drivers")} subtitle={t("drivers.intro")} />
      <div className="flex flex-wrap gap-2">
        <Link href="/drivers" className={`min-h-9 rounded-full px-3.5 py-1.5 text-[13px] font-extrabold ${!city ? "bg-navy text-white" : "bg-cloud text-muted"}`}>{t("common.all")}</Link>
        {cities.map((item) => (
          <Link key={item.id} href={`/drivers?city=${item.id}`} className={`min-h-9 rounded-full px-3.5 py-1.5 text-[13px] font-extrabold ${city === item.id ? "bg-navy text-white" : "bg-cloud text-muted"}`}>{item.name}</Link>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid content-start gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {drivers.length === 0 && <Card><EmptyState>{t("drivers.none")}</EmptyState></Card>}
          {drivers.map((driver) => (
            <Link key={driver.id} href={`/drivers/${driver.id}`} className="press flex items-center gap-3 rounded-[18px] bg-white p-4 shadow-[var(--shadow-card)]">
              <Avatar name={driver.name} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{driver.name}</p>
                <p className="truncate text-xs text-muted">{driver.cityName} · {formatPhone(driver.phone)}</p>
                <p className="truncate text-xs text-muted">{driver.currentJobs.length > 0 ? driver.currentJobs.map((job) => `NF-${job.number} ${job.route}`).join(" · ") : t("assign.noJob")}</p>
              </div>
              <Chip tone={!driver.active ? "grey" : driver.currentJobs.length > 0 ? "amber" : driver.available ? "green" : "grey"}>
                {!driver.active ? t("drivers.suspended") : driver.currentJobs.length > 0 ? t("assign.onJob") : driver.available ? t("driver.available") : t("driver.offline")}
              </Chip>
              <IconChevron className="text-faint" />
            </Link>
          ))}
        </div>
        <Card className="flex h-fit flex-col gap-3">
          <h2 className="font-extrabold">{t("drivers.add")}</h2>
          <AddDriver cities={cities} />
        </Card>
      </div>
    </>
  );
}
