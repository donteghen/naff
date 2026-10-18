import { getTranslator } from "@/i18n/server";
import { formatDayAndTime } from "@/lib/dates";
import { formatXAF, percent } from "@/lib/money";
import { isFinal } from "@/lib/order-steps";
import { formatPhone } from "@/lib/phone";
import type { SenderOrderView } from "@/server/services/order-views";
import { config } from "@/server/config";
import { getSettings } from "@/server/services/settings";
import { CopyButton } from "../CopyButton";
import { IconPhone } from "../Icons";
import { RefreshButton } from "../RefreshButton";
import { Card, Chip, Notice, Row, StatusChip } from "../ui";
import { CallUsButton } from "./CallUsButton";
import { Timeline } from "./Timeline";

/** The sender's view of one order (logged-in user or guest link). */
export async function SenderOrder({ order, guest, codeAlreadyShown = false }: { order: SenderOrderView; guest: boolean; codeAlreadyShown?: boolean }) {
  const { t, tx, language } = await getTranslator();
  const settings = await getSettings();
  const trackingLink = `${config.siteUrl()}/t/${order.trackingCode}`;
  const route = order.type === "intercity" ? `${order.originCityName} → ${order.destinationCityName}` : order.originCityName;

  if (order.status === "requested") {
    return (
      <main className="flex flex-1 flex-col items-center gap-4 px-6 pt-10 pb-8 text-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-amber text-navy animate-pulse-amber"><IconPhone size={48} /></div>
        <h1 className="text-[28px] leading-tight font-extrabold">{t("site.weWillCall")}</h1>
        <p className="text-muted">{t("site.requestReceived", { number: `NF-${order.number}` })}</p>
        {settings.callUsPhone && <p className="text-sm text-muted">{t("site.keepPhoneNear")}</p>}
        {guest && <Notice tone="info" className="w-full text-left">{t("site.guestKeepLink")}</Notice>}
        <div className="w-full"><RefreshButton /></div>
        <div className="mt-auto w-full"><CallUsButton /></div>
      </main>
    );
  }

  const finalTitle = order.status === "delivered" ? t("track.deliveredTitle") : order.status === "cancelled" ? t("track.cancelledTitle") : order.status === "failed" ? t("track.failedTitle") : null;

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-3 pb-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold">{t("site.orderTitle", { number: "" })}<span className="whitespace-nowrap">NF-{order.number}</span></h1>
        <StatusChip status={order.status} label={tx(`status.${order.status}`)} />
      </div>
      <p className="-mt-2 text-sm text-muted">{route} · {order.pickupText.split(",")[0]} → {order.dropoffText.split(",")[0]}</p>
      {!isFinal(order.status) && <RefreshButton />}

      {finalTitle && (
        <Card className={order.status === "delivered" ? "bg-green-tint" : order.status === "failed" ? "bg-red-tint" : ""}>
          <p className="text-lg font-extrabold">{finalTitle}</p>
          {order.status === "cancelled" && order.cancelReason && <p className="text-sm">{order.cancelReason}</p>}
          {order.status === "failed" && <p className="text-sm">{t("track.failedBody")}</p>}
        </Card>
      )}

      {order.netPrice !== null && (
        <Card className="flex flex-col gap-1.5">
          <Row label={t("site.agreedPrice")}>{formatXAF(order.grossPrice ?? 0)}</Row>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-[15px] text-green-ink"><span>{t("site.accountDiscount", { rate: percent(order.discountRate) })}</span><b>−{formatXAF(order.discountAmount)}</b></div>
          )}
          <div className="my-1 border-t border-line" />
          <Row label={t("site.youPay")} strong>{formatXAF(order.netPrice)}</Row>
          <div className="mt-1 flex flex-wrap gap-2">
            <Chip tone={order.paid ? "green" : "amber"}>● {order.paid ? t("common.paid") : t("common.notPaid")}</Chip>
            <Chip tone="grey">{t(`form.fee.${order.feeTiming}`)} · {t(`method.${order.feeMethod}`)}</Chip>
          </div>
        </Card>
      )}

      {order.codeAvailable && (
        <Card className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs font-extrabold tracking-wider text-muted uppercase">{t("site.deliveryCode")}</p>
          {order.deliveryCode ? (
            <>
              <p className="text-[44px] leading-none font-extrabold tracking-[0.35em] tabular-nums">{order.deliveryCode}</p>
              <CopyButton text={order.deliveryCode} label={t("site.copyCode")} className="w-full" />
              {guest && <Notice tone="warning" className="w-full">{t("site.guestCopyNow")}</Notice>}
            </>
          ) : (
            <p className="text-sm text-muted">{codeAlreadyShown ? t("site.codeShownOnce") : "—"}</p>
          )}
        </Card>
      )}

      {order.trackingAvailable ? (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-bold">{t("site.trackingLink")}</p>
          <p className="text-sm break-all text-indigo">{trackingLink}</p>
          <CopyButton text={trackingLink} label={t("site.copyLink")} variant="primary" className="w-full" />
          <p className="text-xs text-muted">{t("site.shareWithReceiver")}</p>
        </Card>
      ) : null}

      {order.agencyName && !isFinal(order.status) && (
        <div className="rounded-[18px] bg-navy p-4 text-white">
          <p className="text-xs font-extrabold tracking-wider text-amber uppercase">{t("track.travelPass")}</p>
          <p className="font-extrabold">{order.agencyName}</p>
          <div className="mt-2 flex justify-between text-sm">
            <span>{t("track.vehicle")}<br /><b>{order.vehicleNumber}</b></span>
            {order.eta && <span className="text-right">{t("track.expectedArrival")}<br /><b>{formatDayAndTime(order.eta, language, t("common.today"))}</b></span>}
          </div>
        </div>
      )}

      <Card>
        <Timeline steps={order.steps} status={order.status} times={order.statusTimes} language={language} labelFor={(step) => tx(`status.${step}`)} nowLabel={t("track.now")} />
      </Card>

      <p className="text-center text-xs text-muted">{t("order.receiver")}: {order.receiver.name} · {formatPhone(order.receiver.phone)}</p>
      <div className="mt-auto"><CallUsButton /></div>
    </main>
  );
}
