import Link from "next/link";
import { notFound } from "next/navigation";
import { DriverManage } from "@/components/panel/DriverManage";
import { DriverNotifications } from "@/components/panel/DriverNotifications";
import { config } from "@/server/config";
import { OrderRow } from "@/components/panel/OrderRow";
import { IconBack } from "@/components/Icons";
import { Card, Chip, EmptyState, PageTitle, SectionLabel, StatCard } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { dayKey, dayRange, formatDateTime, addDays } from "@/lib/dates";
import { formatXAF } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { load } from "@/server/debug";
import { searchOrders } from "@/server/services/order-queries";
import { driverMoneySummary, getDriver } from "@/server/services/people";
import { listAllCities } from "@/server/services/setup";

export const dynamic = "force-dynamic";

export default async function DriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, language } = await getTranslator();
  const driver = await getDriver(id);
  if (!driver) notFound();
  const today = dayRange(dayKey(), dayKey());
  const week = dayRange(addDays(dayKey(), -6), dayKey());
  const [todayMoney, weekMoney, orders, cities] = await Promise.all([
    driverMoneySummary(id, today.start, today.end),
    driverMoneySummary(id, week.start, week.end),
    load("panel.driverOrders", { id }, () => searchOrders({ driverId: id })),
    listAllCities(),
  ]);
  return (
    <>
      <Link href="/drivers" className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-muted"><IconBack size={16} />{t("nav.drivers")}</Link>
      <PageTitle
        title={driver.name}
        subtitle={<span>{driver.cityName} · {formatPhone(driver.phone)} · {t("people.lastSeen")}: {driver.lastSeenAt ? formatDateTime(driver.lastSeenAt, language) : "—"}</span>}
        actions={
          <>
            {driver.mustChangePin && <Chip tone="amber">{t("drivers.tempPinActive")}</Chip>}
            <Chip tone={!driver.active ? "grey" : driver.available ? "green" : "grey"}>{!driver.active ? t("drivers.suspended") : driver.available ? t("driver.available") : t("driver.offline")}</Chip>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("drivers.deliveredToday")} value={todayMoney.delivered} />
        <StatCard label={t("drivers.collectedToday")} value={formatXAF(todayMoney.fees + todayMoney.goods)} note={`${t("order.fee")} ${formatXAF(todayMoney.fees)} · ${t("order.goods")} ${formatXAF(todayMoney.goods)}`} />
        <StatCard label={t("drivers.delivered7")} value={weekMoney.delivered} />
        <StatCard label={t("drivers.collected7")} value={formatXAF(weekMoney.fees + weekMoney.goods)} />
      </div>
      <DriverNotifications driverId={id} topic={driver.ntfyTopic} server={config.ntfyUrl().replace(/^https?:\/\//, "")} />
      <DriverManage driver={{ id, name: driver.name, phone: formatPhone(driver.phone), cityId: driver.cityId, active: driver.active }} cities={cities.filter((city) => city.active || city.id === driver.cityId)} />
      <Card className="overflow-hidden p-0">
        <div className="p-4"><SectionLabel>{t("drivers.jobs", { count: orders.total })}</SectionLabel></div>
        {orders.orders.length === 0 ? <EmptyState>{t("orders.none")}</EmptyState> : orders.orders.map((order) => <OrderRow key={order.id} order={order} href={`/orders/${order.id}`} />)}
      </Card>
    </>
  );
}
