import Link from "next/link";
import { FilterField } from "@/components/panel/FilterForm";
import { Card, PageTitle, SectionLabel, StatCard, buttonClass, inputClass } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { addDays, dayKey } from "@/lib/dates";
import { formatXAF } from "@/lib/money";
import { requireAdminPage } from "@/server/auth/current";
import { load } from "@/server/debug";
import { getDashboard } from "@/server/services/dashboard";

export const dynamic = "force-dynamic";

function validDay(value: string | undefined, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

/** State of affairs for a chosen date range. No comparisons: those are on the Reports page. */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireAdminPage();
  const { t, tx } = await getTranslator();
  const params = await searchParams;
  const today = dayKey();
  const from = validDay(params.from, today);
  const to = validDay(params.to, today);
  const data = await load("panel.dashboard", { from, to }, () => getDashboard(from, to));
  const monthStart = `${today.slice(0, 8)}01`;
  const presets = [
    { label: t("dashboard.today"), from: today, to: today },
    { label: t("dashboard.last7"), from: addDays(today, -6), to: today },
    { label: t("dashboard.thisMonth"), from: monthStart, to: today },
  ];
  const statuses = ["requested", "approved", "assigned", "driver_confirmed", "picked_up", "dropped_at_agency", "in_transit", "arrived_at_agency_b", "collected_at_destination", "delivered", "cancelled", "failed"] as const;

  return (
    <>
      <PageTitle title={t("nav.dashboard")} subtitle={t("dashboard.intro")} />
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-[18px] bg-white p-4 shadow-[var(--shadow-card)]">
        <FilterField label={t("common.from")}><input type="date" name="from" defaultValue={from} className={inputClass()} /></FilterField>
        <FilterField label={t("common.to")}><input type="date" name="to" defaultValue={to} className={inputClass()} /></FilterField>
        <button type="submit" className={buttonClass("primary", "md")}>{t("common.apply")}</button>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Link key={preset.label} href={`/?from=${preset.from}&to=${preset.to}`} className={`min-h-10 rounded-full px-3.5 py-2 text-[13px] font-extrabold ${from === preset.from && to === preset.to ? "bg-navy text-white" : "bg-cloud text-muted"}`}>{preset.label}</Link>
          ))}
        </div>
      </form>

      <SectionLabel>{t("dashboard.orders")}</SectionLabel>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("dashboard.newRequests")} value={data.orders.total} />
        <StatCard label={t("dashboard.awaitingApproval")} value={data.orders.byStatus.requested} />
        <StatCard label={t("dashboard.running")} value={data.orders.running} />
        <StatCard label={t("status.delivered")} value={data.orders.byStatus.delivered} />
        <StatCard label={t("status.cancelled")} value={data.orders.byStatus.cancelled} />
        <StatCard label={t("status.failed")} value={data.orders.byStatus.failed} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <SectionLabel>{t("dashboard.byStatus")}</SectionLabel>
          <table className="w-full text-sm">
            <tbody>
              {statuses.map((status) => (
                <tr key={status} className="border-t border-line first:border-0">
                  <td className="py-2">{tx(`status.${status}`)}</td>
                  <td className="py-2 text-right font-extrabold tabular-nums">{data.orders.byStatus[status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2">
            <SectionLabel>{t("dashboard.rightNow")}</SectionLabel>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Link href="/in-transit" className="rounded-xl bg-mist p-3"><p className="text-muted">{t("status.in_transit")}</p><p className="text-2xl font-extrabold">{data.intercity.inTransit}</p></Link>
              <Link href="/in-transit?filter=eta" className="rounded-xl bg-red-tint p-3"><p className="text-red-ink">{t("transit.etaPassed")}</p><p className="text-2xl font-extrabold">{data.intercity.etaPassed}</p></Link>
              <div className="rounded-xl bg-mist p-3"><p className="text-muted">{t("dashboard.awaitingCollection")}</p><p className="text-2xl font-extrabold">{data.intercity.awaitingCollection}</p></div>
              <Link href="/queue?filter=issues" className="rounded-xl bg-mist p-3"><p className="text-muted">{t("dashboard.issuesOpen")}</p><p className="text-2xl font-extrabold">{data.orders.issuesOpen}</p></Link>
            </div>
          </Card>
          <Card className="flex flex-col gap-2">
            <SectionLabel>{t("dashboard.people")}</SectionLabel>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-mist p-3"><p className="text-muted">{t("dashboard.driversAvailable")}</p><p className="text-2xl font-extrabold">{data.people.driversAvailable}</p></div>
              <div className="rounded-xl bg-mist p-3"><p className="text-muted">{t("dashboard.driversOnJob")}</p><p className="text-2xl font-extrabold">{data.people.driversOnJob}</p></div>
              <div className="rounded-xl bg-mist p-3"><p className="text-muted">{t("dashboard.driversOffline")}</p><p className="text-2xl font-extrabold">{data.people.driversOffline}</p></div>
              <div className="rounded-xl bg-mist p-3"><p className="text-muted">{t("dashboard.cities")}</p><p className="text-2xl font-extrabold">{data.people.cities}</p></div>
              <div className="rounded-xl bg-mist p-3"><p className="text-muted">{t("dashboard.agencies")}</p><p className="text-2xl font-extrabold">{data.people.agencies}</p></div>
              <div className="rounded-xl bg-mist p-3"><p className="text-muted">{t("dashboard.newUsers")}</p><p className="text-2xl font-extrabold">{data.people.newUsers}</p></div>
            </div>
          </Card>
        </div>
      </div>

      <SectionLabel>{t("dashboard.money")}</SectionLabel>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <StatCard label={t("dashboard.gross")} value={formatXAF(data.money.gross)} />
        <StatCard label={t("dashboard.discounts")} value={formatXAF(data.money.discounts)} />
        <StatCard label={t("dashboard.net")} value={formatXAF(data.money.net)} />
        <StatCard label={t("dashboard.agencyFees")} value={formatXAF(data.money.agencyFees)} />
        <StatCard label={t("dashboard.margin")} value={formatXAF(data.money.margin)} />
        <StatCard label={t("dashboard.feesByDrivers")} value={formatXAF(data.money.feesByDrivers)} />
        <StatCard label={t("dashboard.feesAtRequest")} value={formatXAF(data.money.feesAtRequest)} />
        <StatCard label={t("dashboard.goodsCollected")} value={formatXAF(data.money.goodsCollected)} />
        <StatCard label={t("dashboard.goodsNotHanded")} value={formatXAF(data.goodsNotHanded.total)} note={t("dashboard.ordersCount", { count: data.goodsNotHanded.count })} tone={data.goodsNotHanded.count > 0 ? "amber" : undefined} />
      </div>

      <SectionLabel>{t("dashboard.split")}</SectionLabel>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label={`${t("orders.local")} / ${t("orders.intercity")}`} value={`${data.split.local} / ${data.split.intercity}`} />
        <StatCard label={`${t("orders.web")} / ${t("orders.admin")}`} value={`${data.split.web} / ${data.split.admin}`} />
        <StatCard label={`${t("dashboard.registered")} / ${t("dashboard.guests")}`} value={`${data.split.registered} / ${data.split.guest}`} />
      </div>
    </>
  );
}
