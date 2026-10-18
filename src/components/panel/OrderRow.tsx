import Link from "next/link";
import { getTranslator } from "@/i18n/server";
import { formatDateTime, formatTime, dayKey } from "@/lib/dates";
import { formatXAF } from "@/lib/money";
import type { AdminOrderView } from "@/server/services/order-views";
import { IconFlag } from "../Icons";
import { StatusChip } from "../ui";

export function orderRoute(order: Pick<AdminOrderView, "type" | "originCityName" | "destinationCityName" | "pickup" | "dropoff" | "intercityMode">, tx: (key: string) => string) {
  const short = (text: string) => text.split(/[,\n]/)[0].trim();
  if (order.type === "intercity") return `${order.originCityName} → ${order.destinationCityName} · ${tx(`mode.${order.intercityMode}`)}`;
  return `${short(order.pickup.text)} → ${short(order.dropoff.text)}`;
}

/** One order line in lists. Highlighted when selected, when an issue is open, or when the ETA passed. */
export async function OrderRow({ order, href, selected = false }: { order: AdminOrderView; href: string; selected?: boolean }) {
  const { tx, language } = await getTranslator();
  const when = dayKey(new Date(order.createdAt)) === dayKey() ? formatTime(order.createdAt, language) : formatDateTime(order.createdAt, language);
  const tone = order.issue.open || order.etaPassed ? "bg-red-tint/60" : selected ? "bg-amber-soft/70" : "bg-white hover:bg-mist";
  return (
    <Link href={href} className={`flex min-h-14 items-center gap-3 border-b border-line px-4 py-3 transition ${tone}`}>
      <b className="w-[72px] shrink-0 tabular-nums">#{order.number}</b>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px]">
          {orderRoute(order, tx)}
          {order.goods.isSale ? ` · ${tx("summary.saleShort")}` : ""}
        </p>
        <p className="truncate text-xs text-muted">
          {order.sender.name}
          {order.netPrice !== null ? ` · ${formatXAF(order.netPrice)}` : ""}
          {order.needsReceiverConfirmation && !order.receiverConfirmed && order.status === "requested" ? ` · ${tx("approve.confirmFirst")}` : ""}
        </p>
      </div>
      {order.issue.open && <IconFlag size={16} className="shrink-0 text-red" />}
      <span className="hidden sm:inline-flex"><StatusChip status={order.status} label={tx(`status.${order.status}`)} /></span>
      <span className="w-12 shrink-0 text-right text-sm text-muted tabular-nums">{when}</span>
    </Link>
  );
}
