import { InTransitActions } from "@/components/panel/InTransitActions";
import { PendingLink } from "@/components/panel/Pending";
import { Cell, Row, RowActions, RowLink, Table } from "@/components/panel/Table";
import { Card, EmptyState, PageTitle, StatusChip } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { formatDayAndTime } from "@/lib/dates";
import { requireAdminPage } from "@/server/auth/current";
import { load } from "@/server/debug";
import { listInTransit } from "@/server/services/order-queries";

export const dynamic = "force-dynamic";

export default async function InTransitPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireAdminPage();
  const { t, tx, language } = await getTranslator();
  const { filter } = await searchParams;
  const etaOnly = filter === "eta";
  const data = await load("panel.inTransit", { etaOnly }, () => listInTransit(etaOnly));

  return (
    <>
      <PageTitle title={t("transit.title")} subtitle={t("transit.intro")} />
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap gap-2 border-b border-line p-3">
          <PendingLink href="/in-transit" className={`min-h-9 rounded-full px-3.5 py-1.5 text-[13px] font-extrabold ${!etaOnly ? "bg-navy text-white" : "bg-cloud text-muted"}`}>{t("queue.all")} {data.total}</PendingLink>
          <PendingLink href="/in-transit?filter=eta" className={`min-h-9 rounded-full px-3.5 py-1.5 text-[13px] font-extrabold ${etaOnly ? "bg-red text-white" : "bg-red-tint text-red-ink"}`}>⚑ {t("transit.etaPassed")} {data.etaPassedCount}</PendingLink>
        </div>
        {data.orders.length === 0 ? (
          <EmptyState>{t("transit.empty")}</EmptyState>
        ) : (
          <Table
            columns={[
              { label: t("table.order") },
              { label: t("table.route") },
              { label: t("table.agency"), className: "hidden lg:table-cell" },
              { label: t("orders.status"), className: "hidden md:table-cell" },
              { label: t("drop.eta"), className: "hidden sm:table-cell" },
              { label: t("table.actions"), className: "text-right" },
            ]}
          >
            {data.orders.map((order) => (
              <Row key={order.id} tone={order.etaPassed ? "bg-red-tint/70" : ""}>
                <Cell className="whitespace-nowrap tabular-nums"><RowLink href={`/orders/${order.id}`}>#{order.number}</RowLink></Cell>
                <Cell>
                  <p className="font-bold">{order.originCityName} → {order.destinationCityName}</p>
                  <p className="text-xs text-muted">{tx(`mode.${order.intercityMode}`)}</p>
                  <p className="text-xs text-muted lg:hidden">{order.handover.agencyName} · {order.handover.vehicleNumber}</p>
                </Cell>
                <Cell className="hidden lg:table-cell">
                  <p>{order.handover.agencyName}</p>
                  <p className="text-xs text-muted">{order.handover.vehicleNumber} · {order.handover.agencyDriverPhone}</p>
                </Cell>
                <Cell className="hidden md:table-cell"><StatusChip status={order.status} label={tx(`status.${order.status}`)} /></Cell>
                <Cell className={`hidden whitespace-nowrap sm:table-cell ${order.etaPassed ? "font-extrabold text-red" : ""}`}>
                  {order.handover.eta ? formatDayAndTime(order.handover.eta, language, t("common.today")) : "—"}
                  {order.etaPassed && <span className="block text-xs">{t("transit.passed")}</span>}
                </Cell>
                <Cell><RowActions><InTransitActions orderId={order.id} status={order.status} mode={order.intercityMode} /></RowActions></Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
