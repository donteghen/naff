import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { IconChevron } from "@/components/Icons";
import { EmptyState, StatusChip } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { formatDate } from "@/lib/dates";
import { formatXAF } from "@/lib/money";
import { isFinal } from "@/lib/order-steps";
import { requireUserPage } from "@/server/auth/current";
import { load } from "@/server/debug";
import { listUserOrders } from "@/server/services/order-queries";

export const metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

const FILTERS = ["all", "active", "done"] as const;

export default async function MyOrdersPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUserPage("/orders");
  const { t, tx, language } = await getTranslator();
  const { filter = "all" } = await searchParams;
  const all = await load("site.orders", {}, () => listUserOrders(user._id));
  const orders = all.filter((order) => (filter === "active" ? !isFinal(order.status) : filter === "done" ? isFinal(order.status) : true));

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-3 pb-8">
        <h1 className="text-[26px] font-extrabold">{t("site.myOrders")}</h1>
        <div className="flex gap-2">
          {FILTERS.map((item) => (
            <Link key={item} href={`/orders?filter=${item}`} className={`min-h-10 rounded-full px-4 py-2 text-sm font-extrabold ${filter === item ? "bg-navy text-white" : "bg-cloud text-muted"}`}>
              {t(`site.filter.${item}`)}
            </Link>
          ))}
        </div>
        {orders.length === 0 && <EmptyState>{t("site.noOrders")}</EmptyState>}
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.number}`} className="press flex items-center gap-3 rounded-[18px] bg-white p-4 shadow-[var(--shadow-card)]">
            <div className="flex-1">
              <p className="font-extrabold">{order.type === "intercity" ? `${order.originCityName} → ${order.destinationCityName}` : `${order.pickupText.split(",")[0]} → ${order.dropoffText.split(",")[0]}`}</p>
              <p className="text-sm text-muted">NF-{order.number} · {formatDate(order.createdAt, language)}{order.netPrice ? ` · ${formatXAF(order.netPrice)}` : ""}</p>
              <div className="mt-2"><StatusChip status={order.status} label={tx(`status.${order.status}`)} /></div>
            </div>
            <IconChevron className="text-faint" />
          </Link>
        ))}
      </main>
    </>
  );
}
