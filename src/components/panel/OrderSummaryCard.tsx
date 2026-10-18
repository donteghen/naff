import { getTranslator } from "@/i18n/server";
import { formatXAF, percent } from "@/lib/money";
import { orderSummary } from "@/lib/order-summary";
import { formatPhone } from "@/lib/phone";
import type { AdminOrderView } from "@/server/services/order-views";
import { Card, Chip, StatusChip } from "../ui";

/** Plain-language summary of the sender's answers, plus everything the admin needs at a glance. */
export async function OrderSummaryCard({ order, compact = false }: { order: AdminOrderView; compact?: boolean }) {
  const { t, tx } = await getTranslator();
  const summary = orderSummary(order, tx);
  const route = order.type === "intercity" ? `${order.originCityName} → ${order.destinationCityName}` : order.originCityName;
  return (
    <Card className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <StatusChip status={order.status} label={tx(`status.${order.status}`)} />
        <Chip tone={order.fee.status === "paid" ? "green" : "amber"}>● {order.fee.status === "paid" ? t("common.paid") : t("common.notPaid")}</Chip>
        <Chip tone={order.issue.open ? "red" : "grey"}>⚑ {order.issue.open ? order.issue.note || t("exit.issueOpen") : t("exit.noIssue")}</Chip>
        <Chip tone="grey">{order.source === "admin" ? t("order.sourceAdmin") : order.registered ? t("order.sourceUser") : t("order.sourceGuest")}</Chip>
      </div>
      <p className="text-[15px] font-bold">{summary}</p>
      {order.needsReceiverConfirmation && <p className="w-fit rounded-xl bg-amber-soft px-3 py-1.5 text-sm font-extrabold">{t("approve.confirmFirst")}{order.receiverConfirmed ? " ✓" : ""}</p>}
      <div className="grid gap-x-6 gap-y-1 text-[15px] sm:grid-cols-2">
        <p><span className="text-muted">{t("order.route")}:</span> {route}</p>
        <p><span className="text-muted">{t("order.parcel")}:</span> {tx(`size.${order.parcel.size}`)} · {tx(`category.${order.parcel.category}`)}</p>
        <p><span className="text-muted">{t("order.sender")}:</span> {order.sender.name} · <a className="font-bold" href={`tel:+237${order.sender.phone}`}>{formatPhone(order.sender.phone)}</a></p>
        <p><span className="text-muted">{t("order.receiver")}:</span> {order.receiver.name} · <a className="font-bold" href={`tel:+237${order.receiver.phone}`}>{formatPhone(order.receiver.phone)}</a></p>
        {!compact && <p className="sm:col-span-2"><span className="text-muted">{t("order.pickup")}:</span> {order.pickup.text}{order.pickup.lat !== null ? " 📍" : ""}</p>}
        {!compact && <p className="sm:col-span-2"><span className="text-muted">{t("order.dropoff")}:</span> {order.dropoff.text}{order.dropoff.lat !== null ? " 📍" : ""}</p>}
        <p className="sm:col-span-2"><span className="text-muted">{t("form.contents")}:</span> <b>{order.parcel.contents}</b> ({order.parcel.itemCount}){order.parcel.estimatedValue ? ` · ${t("order.estimatedValue")} ${formatXAF(order.parcel.estimatedValue)}` : ""} · {t("order.declarationSigned")} ✓</p>
        {order.pickupTime && <p><span className="text-muted">{t("approve.pickupTime")}:</span> {order.pickupTime}</p>}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-2 text-[15px]">
        {order.deliveryCode ? <p><span className="text-muted">{t("site.deliveryCode")}:</span> <b className="tracking-[0.2em]">{order.deliveryCode}</b></p> : <p className="text-muted">{t("order.noCode")}</p>}
        {order.netPrice !== null && (
          <p>
            <span className="text-muted">{t("approve.agreedPrice")}:</span> <b>{formatXAF(order.grossPrice ?? 0)}</b>
            {order.discountAmount > 0 ? ` − ${formatXAF(order.discountAmount)} (${percent(order.discountRate)}) = ${formatXAF(order.netPrice)}` : ""}
          </p>
        )}
        {order.agencyFee !== null && <p><span className="text-muted">{t("approve.agencyFee")}:</span> <b>{formatXAF(order.agencyFee)}</b></p>}
        <p><span className="text-muted">{t("order.fee")}:</span> {tx(`form.fee.${order.fee.timing}`)} · {tx(`method.${order.fee.method}`)}{order.fee.paidTo ? ` · ${t("order.paidTo", { name: order.fee.paidTo.name })}` : ""}</p>
        {order.goods.isSale && (
          <p>
            <span className="text-muted">{t("order.goods")}:</span> {tx(`form.sale.${order.goods.status}`)} {order.goods.amount ? formatXAF(order.goods.amount) : ""}
            {order.goods.collectedBy ? ` · ${t("order.collectedBy", { name: order.goods.collectedBy.name })}` : ""}
            {order.goods.handedToSeller === true ? ` · ${t("order.handedToSeller")}` : ""}
          </p>
        )}
      </div>
      {(order.cancelReason || order.failReason) && <p className="rounded-xl bg-red-tint px-3 py-2 text-sm font-bold text-red-ink">{order.cancelReason || order.failReason}</p>}
    </Card>
  );
}
