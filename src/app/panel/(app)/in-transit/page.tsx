import Link from "next/link";
import { InTransitActions } from "@/components/panel/InTransitActions";
import { Card, EmptyState, PageTitle, StatusChip } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { formatDayAndTime } from "@/lib/dates";
import { load } from "@/server/debug";
import { listInTransit } from "@/server/services/order-queries";

export const dynamic = "force-dynamic";

export default async function InTransitPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { t, tx, language } = await getTranslator();
  const { filter } = await searchParams;
  const etaOnly = filter === "eta";
  const data = await load("panel.inTransit", { etaOnly }, () => listInTransit(etaOnly));

  return (
    <>
      <PageTitle title={t("transit.title")} subtitle={t("transit.intro")} />
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <Link href="/in-transit" className={`min-h-9 rounded-full px-3.5 py-1.5 text-[13px] font-extrabold ${!etaOnly ? "bg-navy text-white" : "bg-cloud text-muted"}`}>{t("queue.all")} {data.total}</Link>
          <Link href="/in-transit?filter=eta" className={`min-h-9 rounded-full px-3.5 py-1.5 text-[13px] font-extrabold ${etaOnly ? "bg-red text-white" : "bg-red-tint text-red-ink"}`}>⚑ {t("transit.etaPassed")} {data.etaPassedCount}</Link>
        </div>
        {data.orders.length === 0 && <EmptyState>{t("transit.empty")}</EmptyState>}
        {data.orders.map((order) => (
          <div key={order.id} className={`flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center ${order.etaPassed ? "bg-red-tint/70" : ""}`}>
            <Link href={`/orders/${order.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <b className="w-16 shrink-0">#{order.number}</b>
              <div className="min-w-0">
                <p className="font-bold">{order.originCityName} → {order.destinationCityName} · {tx(`mode.${order.intercityMode}`)}</p>
                <p className="text-xs text-muted">{order.handover.agencyName} · {order.handover.vehicleNumber} · {order.handover.agencyDriverPhone}</p>
              </div>
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip status={order.status} label={tx(`status.${order.status}`)} />
              {order.handover.eta && (
                <span className={`text-sm font-extrabold ${order.etaPassed ? "text-red" : ""}`}>
                  {t("drop.eta")} {formatDayAndTime(order.handover.eta, language, t("common.today"))}{order.etaPassed ? ` · ${t("transit.passed")}` : ""}
                </span>
              )}
              <InTransitActions orderId={order.id} status={order.status} mode={order.intercityMode} />
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
