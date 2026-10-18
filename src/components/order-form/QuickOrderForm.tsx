"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createQuickOrderAction } from "@/actions/panel-orders";
import { useT } from "@/i18n/client";
import { cleanDraft, draftToInput, emptyDraft, type OrderDraft } from "@/lib/order-form";
import { orderSummary } from "@/lib/order-summary";
import { useAction } from "../use-action";
import { Button, Card, Field, Notice, SectionLabel, inputClass } from "../ui";
import { ArriveQuestion, CategoryQuestion, ContentsQuestion, FeeQuestion, PeopleQuestion, PlacesQuestion, SaleQuestion, SizeQuestion, WhereQuestion } from "./Questions";

type City = { id: string; name: string };

/**
 * Order taken on the phone by an admin: the same questions as the customer form, on one page,
 * filled from scratch every time. Optionally approved with the agreed price in the same step.
 */
export function QuickOrderForm({ cities }: { cities: City[] }) {
  const { t, tx } = useT();
  const router = useRouter();
  const { run, pending, error, errorValues, fields } = useAction();
  const [draft, setDraft] = useState<OrderDraft>(() => emptyDraft({ originCityId: cities.length === 1 ? cities[0].id : "" }));
  const [approveNow, setApproveNow] = useState(false);
  const [gross, setGross] = useState("");
  const [agencyFee, setAgencyFee] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [receiverConfirmed, setReceiverConfirmed] = useState(false);
  const [paymentReceived, setPaymentReceived] = useState(false);

  const update = (changes: Partial<OrderDraft>) => setDraft((current) => cleanDraft({ ...current, ...changes }));
  const errors: Record<string, string> = {};
  for (const [field, key] of Object.entries(fields)) errors[field === "sender" ? "senderName" : field === "receiver" ? "receiverName" : field] = key;
  const destinationName = cities.find((city) => city.id === draft.destinationCityId)?.name ?? "";
  const isSale = draft.sale === "already_paid" || draft.sale === "receiver_pays";
  const needsReceiver = !isSale && draft.feeTiming === "delivery";

  function submit() {
    const approve = approveNow
      ? { grossPrice: Number(gross), agencyFee: draft.type === "intercity" ? Number(agencyFee || 0) : null, pickupTime, receiverConfirmed, paymentReceived }
      : null;
    run("quickOrder", () => createQuickOrderAction(draftToInput(draft), approve), (result) => router.push(`/orders/${result.id}`));
  }

  const block = (title: string, content: React.ReactNode) => (
    <Card className="flex flex-col gap-3">
      <SectionLabel>{title}</SectionLabel>
      {content}
    </Card>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {block(t("form.q.people"), <PeopleQuestion draft={draft} update={update} errors={errors} />)}
      {block(t("form.q.where"), (
        <>
          <WhereQuestion draft={draft} update={update} errors={errors} cities={cities} compact />
          {draft.type === "intercity" && <ArriveQuestion draft={draft} update={update} errors={errors} destinationName={destinationName} compact />}
        </>
      ))}
      {block(t("form.q.places"), <PlacesQuestion draft={draft} update={update} errors={errors} />)}
      {block(t("form.q.sale"), <SaleQuestion draft={draft} update={update} errors={errors} compact />)}
      {block(t("form.q.fee"), <FeeQuestion draft={draft} update={update} errors={errors} compact />)}
      {block(t("form.q.size"), <SizeQuestion draft={draft} update={update} errors={errors} compact />)}
      {block(t("form.q.category"), <CategoryQuestion draft={draft} update={update} errors={errors} />)}
      {block(t("form.q.contents"), <ContentsQuestion draft={draft} update={update} errors={errors} showForbiddenLink={false} />)}

      <Card className="flex flex-col gap-3 lg:col-span-2">
        {draft.type && draft.sale && draft.feeTiming && (
          <p className="font-bold">
            {orderSummary({ type: draft.type, intercityMode: draft.intercityMode, destinationCityName: destinationName, goods: { isSale, status: isSale ? (draft.sale as "already_paid" | "receiver_pays") : null, amount: Number(draft.goodsAmount) || 0 }, fee: { timing: draft.feeTiming, method: draft.feeMethod ?? "cash" } }, tx)}
          </p>
        )}
        <label className="flex min-h-12 items-center gap-3 font-extrabold">
          <input type="checkbox" className="h-5 w-5 accent-[#0B1B3F]" checked={approveNow} onChange={(event) => setApproveNow(event.target.checked)} />
          {t("quick.approveNow")}
        </label>
        {approveNow && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t("approve.agreedPrice")} error={fields.grossPrice ? tx(fields.grossPrice) : undefined}><input className={inputClass()} inputMode="numeric" value={gross} onChange={(event) => setGross(event.target.value.replace(/\D/g, ""))} /></Field>
            {draft.type === "intercity" && <Field label={t("approve.agencyFee")}><input className={inputClass()} inputMode="numeric" value={agencyFee} onChange={(event) => setAgencyFee(event.target.value.replace(/\D/g, ""))} /></Field>}
            <Field label={t("approve.pickupTime")}><input className={inputClass()} value={pickupTime} onChange={(event) => setPickupTime(event.target.value)} placeholder={t("common.optional")} /></Field>
            {needsReceiver && (
              <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-amber-soft px-4 font-extrabold sm:col-span-3">
                <input type="checkbox" className="h-5 w-5" checked={receiverConfirmed} onChange={(event) => setReceiverConfirmed(event.target.checked)} />
                {t("approve.receiverConfirmed")}
              </label>
            )}
            {draft.feeTiming === "request" && (
              <label className="flex min-h-12 items-center gap-3 rounded-2xl bg-indigo-tint px-4 font-extrabold text-indigo sm:col-span-3">
                <input type="checkbox" className="h-5 w-5" checked={paymentReceived} onChange={(event) => setPaymentReceived(event.target.checked)} />
                {t("approve.paymentReceived", { method: draft.feeMethod ? tx(`method.${draft.feeMethod}`) : "" })}
              </label>
            )}
          </div>
        )}
        {error && <Notice tone="error">{error === "errors.checkForm" ? Object.values(fields).map((key) => tx(key)).join(" · ") : tx(error, errorValues)}</Notice>}
        <Button variant="action" disabled={pending} onClick={submit}>{pending ? t("common.wait") : approveNow ? t("quick.createApprove") : t("quick.create")}</Button>
      </Card>
    </div>
  );
}
