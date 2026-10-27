import Link from "next/link";
import { ApprovePanel } from "@/components/panel/order/ApprovePanel";
import { OrderRow } from "@/components/panel/OrderRow";
import { OrderSummaryCard } from "@/components/panel/OrderSummaryCard";
import { ButtonLink, Card, EmptyState, PageTitle } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { requireAdminPage } from "@/server/auth/current";
import { load } from "@/server/debug";
import { listQueue, type QueueFilter } from "@/server/services/order-queries";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

const FILTERS: QueueFilter[] = ["all", "requested", "active", "issues"];

export default async function QueuePage({ searchParams }: { searchParams: Promise<{ filter?: string; id?: string }> }) {
  await requireAdminPage();
  const { t } = await getTranslator();
  const params = await searchParams;
  const filter = (FILTERS.includes(params.filter as QueueFilter) ? params.filter : "all") as QueueFilter;
  const { orders, counts } = await load("panel.queue", { filter }, () => listQueue(filter));
  const selected = orders.find((order) => order.id === params.id) ?? orders.find((order) => order.status === "requested") ?? null;
  const settings = await getSettings();

  return (
    <>
      <PageTitle title={t("nav.queue")} />
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap gap-2 border-b border-line p-3">
            {FILTERS.map((item) => (
              <Link key={item} href={`/queue?filter=${item}`} className={`min-h-9 rounded-full px-3.5 py-1.5 text-[13px] font-extrabold ${filter === item ? "bg-navy text-white" : item === "requested" ? "bg-amber-soft text-amber-ink" : item === "issues" ? "bg-red-tint text-red-ink" : "bg-cloud text-muted"}`}>
                {t(`queue.${item}`)} {counts[item]}
              </Link>
            ))}
          </div>
          {orders.length === 0 ? <EmptyState>{t("queue.empty")}</EmptyState> : orders.map((order) => <OrderRow key={order.id} order={order} href={`/queue?filter=${filter}&id=${order.id}`} selected={order.id === selected?.id} />)}
        </Card>

        <div className="flex flex-col gap-3">
          {selected ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold">#{selected.number}</h2>
                <ButtonLink href={`/orders/${selected.id}`} variant="secondary" size="sm">{t("queue.openOrder")}</ButtonLink>
              </div>
              <OrderSummaryCard order={selected} compact />
              {selected.status === "requested" && (
                <Card><ApprovePanel key={selected.id} order={selected} discountRate={settings.discountRate} /></Card>
              )}
            </>
          ) : (
            <Card><EmptyState>{t("queue.selectOrder")}</EmptyState></Card>
          )}
        </div>
      </div>
    </>
  );
}
