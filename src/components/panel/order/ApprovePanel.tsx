"use client";

import { useState } from "react";
import { approveAction, receiverConfirmedAction } from "@/actions/panel-orders";
import { useT } from "@/i18n/client";
import { computePrice, formatXAF, percent } from "@/lib/money";
import type { AdminOrderView } from "@/server/services/order-views";
import { useAction } from "../../use-action";
import { Button, Field, Notice, Row, inputClass } from "../../ui";

/** Enter the agreed (gross) price, tick the checks, approve in one action. */
export function ApprovePanel({ order, discountRate }: { order: AdminOrderView; discountRate: number }) {
  const { t, tx } = useT();
  const { run, pending, error, errorValues, fields } = useAction();
  const [gross, setGross] = useState("");
  const [agencyFee, setAgencyFee] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [receiverConfirmed, setReceiverConfirmed] = useState(order.receiverConfirmed);
  const [paymentReceived, setPaymentReceived] = useState(false);

  const grossValue = Number(gross) || 0;
  const price = computePrice(grossValue, discountRate, order.registered);
  const blocked = (order.needsReceiverConfirmation && !receiverConfirmed) || (order.fee.timing === "request" && !paymentReceived);

  function toggleReceiver(value: boolean) {
    setReceiverConfirmed(value);
    run("receiverConfirmed", () => receiverConfirmedAction(order.id, value));
  }

  return (
    <div className="flex flex-col gap-3">
      {order.needsReceiverConfirmation && (
        <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-amber-soft px-4 font-extrabold">
          <input type="checkbox" className="h-5 w-5 accent-[#0B1B3F]" checked={receiverConfirmed} onChange={(event) => toggleReceiver(event.target.checked)} />
          {t("approve.receiverConfirmed")}
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("approve.agreedPrice")} error={fields.grossPrice ? tx(fields.grossPrice) : undefined}>
          <input className={inputClass(Boolean(fields.grossPrice))} inputMode="numeric" value={gross} onChange={(event) => setGross(event.target.value.replace(/\D/g, ""))} placeholder="2500" />
        </Field>
        {order.type === "intercity" && (
          <Field label={t("approve.agencyFee")} hint={t("approve.adminOnly")} error={fields.agencyFee ? tx(fields.agencyFee) : undefined}>
            <input className={inputClass(Boolean(fields.agencyFee))} inputMode="numeric" value={agencyFee} onChange={(event) => setAgencyFee(event.target.value.replace(/\D/g, ""))} placeholder="500" />
          </Field>
        )}
        <Field label={t("approve.pickupTime")} className={order.type === "intercity" ? "col-span-2" : ""}>
          <input className={inputClass()} value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} placeholder={t("common.optional")} />
        </Field>
      </div>
      <div className="flex flex-col gap-1 rounded-2xl bg-mist p-3.5">
        <Row label={t("approve.agreedPrice")}>{formatXAF(grossValue)}</Row>
        {price.discountAmount > 0 && <div className="flex justify-between text-[15px] text-green-ink"><span>{t("site.accountDiscount", { rate: percent(price.discountRate) })}</span><b>−{formatXAF(price.discountAmount)}</b></div>}
        <Row label={t("approve.customerPays")} strong>{formatXAF(price.netPrice)}</Row>
        {!order.registered && <p className="text-xs text-muted">{t("approve.noDiscountGuest")}</p>}
      </div>
      {order.fee.timing === "request" && (
        <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-indigo-tint px-4 font-extrabold text-indigo">
          <input type="checkbox" className="h-5 w-5 accent-[#14307A]" checked={paymentReceived} onChange={(event) => setPaymentReceived(event.target.checked)} />
          {t("approve.paymentReceived", { method: tx(`method.${order.fee.method}`) })}
        </label>
      )}
      {error && error !== "errors.checkForm" && <Notice tone="error">{tx(error, errorValues)}</Notice>}
      <Button
        variant="action"
        disabled={pending || !grossValue || blocked}
        onClick={() => run("approve", () => approveAction(order.id, { grossPrice: grossValue, agencyFee: order.type === "intercity" ? Number(agencyFee || 0) : null, pickupTime, receiverConfirmed, paymentReceived }))}
      >
        {t("approve.approve")}
      </Button>
      {blocked && <p className="text-center text-xs font-bold text-muted">{order.needsReceiverConfirmation && !receiverConfirmed ? t("approve.blockedReceiver") : t("approve.blockedPayment")}</p>}
    </div>
  );
}
