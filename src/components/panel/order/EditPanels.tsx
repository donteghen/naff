"use client";

import { useState, type ReactNode } from "react";
import { correctFeeAction, editDetailsAction, editPaymentAction, editPriceAction, goodsHandedAction } from "@/actions/panel-orders";
import { useT } from "@/i18n/client";
import { PARCEL_CATEGORIES, PARCEL_SIZES, type FeeTiming, type PaymentMethod } from "@/lib/constants";
import type { Place } from "@/lib/location";
import { feeTimingOptions, methodOptions, saleOptions, type SaleChoice } from "@/lib/order-form";
import { formatPhone } from "@/lib/phone";
import type { AdminOrderView } from "@/server/services/order-views";
import { PlaceField } from "../../order-form/PlaceField";
import { useAction } from "../../use-action";
import { Button, Field, Notice, inputClass } from "../../ui";

/** Collapsible section. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-[18px] bg-white shadow-[var(--shadow-card)]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-extrabold">
        {title}
        <span className="text-muted transition group-open:rotate-90">›</span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-line p-4">{children}</div>
    </details>
  );
}

function useForm() {
  const action = useAction();
  const { t, tx } = useT();
  const [saved, setSaved] = useState(false);
  const feedback = (
    <>
      {action.error && action.error !== "errors.checkForm" && <Notice tone="error">{tx(action.error, action.errorValues)}</Notice>}
      {action.error === "errors.checkForm" && <Notice tone="error">{Object.values(action.fields).map((key) => tx(key)).join(" · ")}</Notice>}
      {saved && !action.error && <Notice tone="success">{t("common.saved")}</Notice>}
    </>
  );
  return { ...action, saved, setSaved, feedback };
}

export function PriceEdit({ order }: { order: AdminOrderView }) {
  const { t } = useT();
  const form = useForm();
  const [gross, setGross] = useState(String(order.grossPrice ?? ""));
  const [agencyFee, setAgencyFee] = useState(String(order.agencyFee ?? ""));
  const [reason, setReason] = useState("");
  return (
    <Section title={t("edit.price")}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("edit.newPrice")}><input className={inputClass()} inputMode="numeric" value={gross} onChange={(event) => setGross(event.target.value.replace(/\D/g, ""))} /></Field>
        {order.type === "intercity" && <Field label={t("approve.agencyFee")}><input className={inputClass()} inputMode="numeric" value={agencyFee} onChange={(event) => setAgencyFee(event.target.value.replace(/\D/g, ""))} /></Field>}
        <Field label={t("edit.reasonRequired")} className="col-span-2"><input className={inputClass()} value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
      </div>
      {form.feedback}
      <Button size="md" disabled={form.pending} onClick={() => { form.setSaved(false); form.run("editPrice", () => editPriceAction(order.id, { grossPrice: Number(gross), agencyFee: order.type === "intercity" ? Number(agencyFee || 0) : null, reason }), () => { setReason(""); form.setSaved(true); }); }}>{t("common.save")}</Button>
    </Section>
  );
}

export function DetailsEdit({ order }: { order: AdminOrderView }) {
  const { t } = useT();
  const form = useForm();
  const [sender, setSender] = useState({ name: order.sender.name, phone: formatPhone(order.sender.phone) });
  const [receiver, setReceiver] = useState({ name: order.receiver.name, phone: formatPhone(order.receiver.phone) });
  const [pickup, setPickup] = useState<Place>({ text: order.pickup.text, lat: order.pickup.lat ?? undefined, lng: order.pickup.lng ?? undefined });
  const [dropoff, setDropoff] = useState<Place>({ text: order.dropoff.text, lat: order.dropoff.lat ?? undefined, lng: order.dropoff.lng ?? undefined });
  const [parcel, setParcel] = useState({ size: order.parcel.size, category: order.parcel.category, contents: order.parcel.contents, itemCount: String(order.parcel.itemCount) });
  const [pickupTime, setPickupTime] = useState(order.pickupTime);
  const [language, setLanguage] = useState(order.language);
  return (
    <Section title={t("edit.details")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t("order.sender")} · ${t("form.name")}`}><input className={inputClass()} value={sender.name} onChange={(event) => setSender({ ...sender, name: event.target.value })} /></Field>
        <Field label={`${t("order.sender")} · ${t("form.phone")}`}><input className={inputClass()} value={sender.phone} onChange={(event) => setSender({ ...sender, phone: event.target.value })} /></Field>
        <Field label={`${t("order.receiver")} · ${t("form.name")}`}><input className={inputClass()} value={receiver.name} onChange={(event) => setReceiver({ ...receiver, name: event.target.value })} /></Field>
        <Field label={`${t("order.receiver")} · ${t("form.phone")}`}><input className={inputClass()} value={receiver.phone} onChange={(event) => setReceiver({ ...receiver, phone: event.target.value })} /></Field>
      </div>
      <PlaceField label={t("order.pickup")} value={pickup} onChange={setPickup} />
      <PlaceField label={t("order.dropoff")} value={dropoff} onChange={setDropoff} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("order.size")}>
          <select className={inputClass()} value={parcel.size} onChange={(event) => setParcel({ ...parcel, size: event.target.value as typeof parcel.size })}>
            {PARCEL_SIZES.map((size) => <option key={size} value={size}>{t(`size.${size}`)}</option>)}
          </select>
        </Field>
        <Field label={t("order.category")}>
          <select className={inputClass()} value={parcel.category} onChange={(event) => setParcel({ ...parcel, category: event.target.value as typeof parcel.category })}>
            {PARCEL_CATEGORIES.map((category) => <option key={category} value={category}>{t(`category.${category}`)}</option>)}
          </select>
        </Field>
        <Field label={t("form.contents")}><input className={inputClass()} value={parcel.contents} onChange={(event) => setParcel({ ...parcel, contents: event.target.value })} /></Field>
        <Field label={t("form.itemCount")}><input className={inputClass()} inputMode="numeric" value={parcel.itemCount} onChange={(event) => setParcel({ ...parcel, itemCount: event.target.value.replace(/\D/g, "") })} /></Field>
        <Field label={t("approve.pickupTime")}><input className={inputClass()} value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} /></Field>
        <Field label={t("order.language")} hint={t("order.languageHint")}>
          <select className={inputClass()} value={language} onChange={(event) => setLanguage(event.target.value as "fr" | "en")}>
            <option value="fr">{t("quick.language.fr")}</option>
            <option value="en">{t("quick.language.en")}</option>
          </select>
        </Field>
      </div>
      {form.feedback}
      <Button
        size="md"
        disabled={form.pending}
        onClick={() => {
          form.setSaved(false);
          form.run(
            "editDetails",
            () => editDetailsAction(order.id, { sender, receiver, pickup: { text: pickup.text, lat: pickup.lat ?? null, lng: pickup.lng ?? null }, dropoff: { text: dropoff.text, lat: dropoff.lat ?? null, lng: dropoff.lng ?? null }, size: parcel.size, category: parcel.category, contents: parcel.contents, itemCount: Number(parcel.itemCount) || 1, pickupTime, language }),
            () => form.setSaved(true),
          );
        }}
      >
        {t("common.save")}
      </Button>
    </Section>
  );
}

export function PaymentEdit({ order }: { order: AdminOrderView }) {
  const { t } = useT();
  const form = useForm();
  const [sale, setSale] = useState<SaleChoice>(order.goods.isSale ? (order.goods.status ?? "already_paid") : "no");
  const [goodsAmount, setGoodsAmount] = useState(String(order.goods.amount || ""));
  const [timing, setTiming] = useState<FeeTiming>(order.fee.timing);
  const [method, setMethod] = useState<PaymentMethod>(order.fee.method);
  const [reason, setReason] = useState("");
  const methods = methodOptions(timing);
  return (
    <Section title={t("edit.payment")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("form.q.sale")}>
          <select className={inputClass()} value={sale} onChange={(event) => setSale(event.target.value as SaleChoice)}>
            {saleOptions(order.type).map((option) => <option key={option} value={option}>{t(`form.sale.${option}`)}</option>)}
          </select>
        </Field>
        {sale !== "no" && <Field label={t("form.goodsAmount")}><input className={inputClass()} inputMode="numeric" value={goodsAmount} onChange={(event) => setGoodsAmount(event.target.value.replace(/\D/g, ""))} /></Field>}
        <Field label={t("form.q.fee")}>
          <select className={inputClass()} value={timing} onChange={(event) => { const next = event.target.value as FeeTiming; setTiming(next); if (!methodOptions(next).includes(method)) setMethod(methodOptions(next)[0]); }}>
            {feeTimingOptions(order.type).map((option) => <option key={option} value={option}>{t(`form.fee.${option}`)}</option>)}
          </select>
        </Field>
        <Field label={t("form.method")}>
          <select className={inputClass()} value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
            {methods.map((option) => <option key={option} value={option}>{t(`method.${option}`)}</option>)}
          </select>
        </Field>
        <Field label={t("edit.reasonRequired")} className="sm:col-span-2"><input className={inputClass()} value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
      </div>
      {form.feedback}
      <Button size="md" disabled={form.pending} onClick={() => { form.setSaved(false); form.run("editPayment", () => editPaymentAction(order.id, { isSale: sale !== "no", goodsStatus: sale === "no" ? null : sale, goodsAmount: Number(goodsAmount) || 0, feeTiming: timing, feeMethod: method, reason }), () => { setReason(""); form.setSaved(true); }); }}>{t("common.save")}</Button>
    </Section>
  );
}

export function MoneyRecords({ order, drivers }: { order: AdminOrderView; drivers: { id: string; name: string }[] }) {
  const { t } = useT();
  const fee = useForm();
  const goods = useForm();
  const [paid, setPaid] = useState(order.fee.status === "paid");
  const [paidTo, setPaidTo] = useState(order.fee.paidTo?.id ?? "");
  const [reason, setReason] = useState("");
  const [handed, setHanded] = useState<string>(order.goods.handedToSeller === null ? "" : order.goods.handedToSeller ? "yes" : "no");
  const [handedBy, setHandedBy] = useState(order.goods.handedBy?.id ?? order.goods.collectedBy?.id ?? "");
  return (
    <Section title={t("edit.money")}>
      <p className="text-sm font-extrabold">{t("edit.feeRecord")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("edit.feeStatus")}>
          <select className={inputClass()} value={paid ? "paid" : "unpaid"} onChange={(event) => setPaid(event.target.value === "paid")}>
            <option value="unpaid">{t("common.notPaid")}</option>
            <option value="paid">{t("common.paid")}</option>
          </select>
        </Field>
        <Field label={t("edit.paidToDriver")}>
          <select className={inputClass()} value={paidTo} onChange={(event) => setPaidTo(event.target.value)} disabled={!paid}>
            <option value="">{t("edit.paidToOffice")}</option>
            {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
          </select>
        </Field>
        <Field label={t("edit.reasonRequired")} className="sm:col-span-2"><input className={inputClass()} value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
      </div>
      {fee.feedback}
      <Button size="md" variant="secondary" disabled={fee.pending} onClick={() => { fee.setSaved(false); fee.run("correctFee", () => correctFeeAction(order.id, { paid, driverId: paidTo || null, reason }), () => { setReason(""); fee.setSaved(true); }); }}>{t("edit.saveCorrection")}</Button>

      {order.goods.isSale && (
        <>
          <p className="mt-3 text-sm font-extrabold">{t("edit.goodsHanded")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("edit.handedQuestion")}>
              <select className={inputClass()} value={handed} onChange={(event) => setHanded(event.target.value)}>
                <option value="">—</option>
                <option value="yes">{t("common.yes")}</option>
                <option value="no">{t("common.no")}</option>
              </select>
            </Field>
            <Field label={t("edit.handedBy")}>
              <select className={inputClass()} value={handedBy} onChange={(event) => setHandedBy(event.target.value)} disabled={handed !== "yes"}>
                <option value="">—</option>
                {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
              </select>
            </Field>
          </div>
          {goods.feedback}
          <Button size="md" variant="secondary" disabled={goods.pending} onClick={() => { goods.setSaved(false); goods.run("goodsHanded", () => goodsHandedAction(order.id, handed === "" ? null : handed === "yes", handed === "yes" ? handedBy || null : null), () => goods.setSaved(true)); }}>{t("common.save")}</Button>
        </>
      )}
    </Section>
  );
}
