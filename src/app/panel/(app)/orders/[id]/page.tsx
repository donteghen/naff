import { notFound } from "next/navigation";
import { ActivityList } from "@/components/panel/order/ActivityList";
import { ApprovePanel } from "@/components/panel/order/ApprovePanel";
import { AssignPanel } from "@/components/panel/order/AssignPanel";
import { DetailsEdit, MoneyRecords, PaymentEdit, PriceEdit } from "@/components/panel/order/EditPanels";
import { ExitPanel } from "@/components/panel/order/ExitPanel";
import { StatusActions } from "@/components/panel/order/StatusActions";
import { WhatsAppButtons } from "@/components/panel/order/WhatsAppButtons";
import { OrderSummaryCard } from "@/components/panel/OrderSummaryCard";
import { Card, PageTitle, SectionLabel } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { hasReached, isFinal } from "@/lib/order-steps";
import { translate } from "@/i18n";
import { formatDayAndTime } from "@/lib/dates";
import { areaName } from "@/lib/location";
import { formatXAF } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { codeForReceiverMessage, jobDetailsMessage, priceMessage, trackingMessageForReceiver, trackingMessageForSender } from "@/lib/whatsapp";
import { SendCodeButton } from "@/components/panel/order/SendCodeButton";
import { requireAdminPage } from "@/server/auth/current";
import { config } from "@/server/config";
import { load } from "@/server/debug";
import { getAdminOrder } from "@/server/services/order-queries";
import { getSettings, mobileMoneyText } from "@/server/services/settings";

export const dynamic = "force-dynamic";

export default async function PanelOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const { t, tx } = await getTranslator();
  const data = await load("panel.order", { id }, () => getAdminOrder(id));
  if (!data) notFound();
  const { order, activity, drivers, agencies } = data;
  const settings = await getSettings();
  const final = isFinal(order.status);

  const label = `NF-${order.number}`;
  const link = `${config.siteUrl()}/t/${order.trackingCode}`;
  // Every message about the order is written in the order's language (SPEC §6.2b); buttons use the admin's.
  const otx = (key: string, values?: Record<string, string | number>) => translate(order.language, key, values);
  const messages = [];
  if (order.netPrice !== null) {
    messages.push({ key: "price", label: t("wa.sendPrice"), phone: order.sender.phone, text: priceMessage(otx, { number: label, netPrice: order.netPrice, discountAmount: order.discountAmount }, order.fee.timing === "request" ? mobileMoneyText(settings, { mtn: otx("method.mtn_momo"), orange: otx("method.orange_money") }) : "") });
  }
  const tracking = hasReached(order.status, "driver_confirmed") && !final;
  if (tracking) {
    messages.push({ key: "sender", label: t("wa.sendTrackingSender"), phone: order.sender.phone, text: trackingMessageForSender(otx, { number: label, link, code: order.deliveryCode }) });
    messages.push({ key: "receiver", label: t("wa.sendTrackingReceiver"), phone: order.receiver.phone, text: trackingMessageForReceiver(otx, { number: label, link }) });
  }

  /** "Send job details" for the assigned driver of a leg (never the delivery code). */
  function jobMessage(role: "origin" | "destination") {
    const driver = role === "origin" ? order.originDriver : order.destinationDriver;
    if (!driver) return null;
    const feeDue = order.fee.status === "unpaid" && order.netPrice !== null ? order.netPrice : 0;
    const goodsDue = order.goods.isSale && order.goods.status === "receiver_pays" && !order.goods.collected ? order.goods.amount : 0;
    const deliveryDue = (order.fee.timing === "delivery" ? feeDue : 0) + goodsDue;
    const registeredUnder =
      order.intercityMode === "collect_at_agency" ? order.receiver : order.destinationDriver ? { name: order.destinationDriver.name, phone: order.destinationDriver.phone } : null;
    return jobDetailsMessage(otx, {
      number: label,
      role,
      type: order.type,
      intercityMode: order.intercityMode,
      route: order.type === "intercity" ? `${order.originCityName} → ${order.destinationCityName}` : `${areaName(order.pickup.text)} → ${areaName(order.dropoff.text)}`,
      parcel: `${otx(`size.${order.parcel.size}`)}, ${otx(`category.${order.parcel.category}`)} · ${order.parcel.contents} (${order.parcel.itemCount})`,
      pickupTime: order.pickupTime,
      sender: { name: order.sender.name, phone: formatPhone(order.sender.phone) },
      receiver: { name: order.receiver.name, phone: formatPhone(order.receiver.phone) },
      pickup: order.pickup,
      dropoff: order.dropoff,
      registeredUnder: registeredUnder ? { name: registeredUnder.name, phone: formatPhone(registeredUnder.phone) } : null,
      handover: order.handover.agencyName
        ? { agencyName: order.handover.agencyName, vehicleNumber: order.handover.vehicleNumber, eta: order.handover.eta ? formatDayAndTime(order.handover.eta, order.language, otx("common.today")) : "—" }
        : null,
      collectAtPickup: order.fee.timing === "pickup" && feeDue > 0 ? `${formatXAF(feeDue)} (${otx(`method.${order.fee.method}`)})` : "",
      collectAtDelivery: deliveryDue > 0 ? formatXAF(deliveryDue) : "",
      jobLink: `${config.driverUrl()}/jobs/${order.id}`,
    });
  }
  const codeMessage = tracking && order.deliveryCode ? codeForReceiverMessage(otx, { number: label, code: order.deliveryCode, link }) : null;

  const originCanChange = ["approved", "assigned", "driver_confirmed"].includes(order.status);
  const destinationCanChange = order.status !== "requested" && !final && !hasReached(order.status, "collected_at_destination");

  return (
    <>
      <PageTitle
        title={t("panel.orderTitle", { number: label })}
        subtitle={
          <div className="flex flex-wrap gap-2">
            <WhatsAppButtons messages={messages} />
            {codeMessage && <SendCodeButton orderId={order.id} phone={order.receiver.phone} text={codeMessage} />}
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <OrderSummaryCard order={order} />

          {order.status === "requested" && (
            <Card className="flex flex-col gap-3">
              <SectionLabel>{t("approve.title")}</SectionLabel>
              <ApprovePanel order={order} discountRate={settings.discountRate} />
            </Card>
          )}

          {order.status !== "requested" && !final && (
            <Card className="flex flex-col gap-3">
              <SectionLabel>{t("assign.title")}</SectionLabel>
              <AssignPanel orderId={order.id} role="origin" cityId={order.originCityId} cityName={order.originCityName} drivers={drivers} current={order.originDriver} confirmed={Boolean(order.originConfirmedAt)} canChange={originCanChange} jobMessage={jobMessage("origin")} />
              {order.intercityMode === "to_address" && (
                <AssignPanel orderId={order.id} role="destination" cityId={order.destinationCityId} cityName={order.destinationCityName} drivers={drivers} current={order.destinationDriver} confirmed={Boolean(order.destinationConfirmedAt)} canChange={destinationCanChange} jobMessage={jobMessage("destination")} />
              )}
              {order.intercityMode === "to_address" && !order.destinationDriver && <p className="text-xs font-bold text-muted">{t("assign.dropLocked")}</p>}
            </Card>
          )}

          {!final && order.status !== "requested" && order.status !== "approved" && (
            <Card className="flex flex-col gap-3">
              <SectionLabel>{t("actions.title")}</SectionLabel>
              <StatusActions order={order} agencies={agencies} />
            </Card>
          )}

          {order.handover.agencyName && (
            <Card className="flex flex-col gap-1 text-[15px]">
              <SectionLabel>{t("order.handover")}</SectionLabel>
              <p>{order.handover.agencyName} · {t("track.vehicle")} <b>{order.handover.vehicleNumber}</b> · {t("drop.agencyDriverPhone")} {order.handover.agencyDriverPhone}</p>
              <p>{t("drop.registerUnder")}: {order.handover.registeredUnderName} · {order.handover.registeredUnderPhone}</p>
              <p className="text-sm text-muted">
                {t("actions.originPhoto")}: {order.handover.originPhotoConfirmed ? "✓" : "—"} · {t("actions.destinationPhoto")}: {order.handover.destinationPhotoConfirmed ? "✓" : "—"}
              </p>
            </Card>
          )}

          {order.status === "delivered" && order.intercityMode === "to_address" && <StatusActions order={order} agencies={agencies} />}

          <Card className="flex flex-col gap-3">
            <SectionLabel>{t("exit.title")}</SectionLabel>
            {final ? <p className="text-sm text-muted">{t("exit.finished")}</p> : <ExitPanel order={order} />}
          </Card>

          <div className="flex flex-col gap-3">
            {order.netPrice !== null && order.status !== "cancelled" && order.status !== "failed" && <PriceEdit order={order} />}
            {!final && <DetailsEdit order={order} />}
            {["requested", "approved", "assigned", "driver_confirmed"].includes(order.status) && <PaymentEdit order={order} />}
            {order.status !== "requested" && <MoneyRecords order={order} drivers={drivers.map((driver) => ({ id: driver.id, name: driver.name }))} />}
          </div>
        </div>

        <Card className="flex h-fit flex-col gap-4 xl:sticky xl:top-4">
          <SectionLabel>{t("panel.activity")}</SectionLabel>
          <ActivityList entries={activity} />
        </Card>
      </div>
    </>
  );
}
