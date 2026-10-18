"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createWebOrderAction } from "@/actions/site";
import { useT } from "@/i18n/client";
import { cleanDraft, draftToInput, emptyDraft, type OrderDraft } from "@/lib/order-form";
import { orderSummary } from "@/lib/order-summary";
import { IconBack } from "../Icons";
import { useAction } from "../use-action";
import { Button, Card, Notice } from "../ui";
import {
  ArriveQuestion,
  CategoryQuestion,
  ContentsQuestion,
  FeeQuestion,
  PeopleQuestion,
  PlacesQuestion,
  SaleQuestion,
  SizeQuestion,
  WhereQuestion,
} from "./Questions";

type City = { id: string; name: string };
type Step = "where" | "arrive" | "sale" | "fee" | "size" | "category" | "contents" | "places" | "people" | "review";

function stepsFor(draft: OrderDraft): Step[] {
  const steps: Step[] = ["where"];
  if (draft.type === "intercity") steps.push("arrive");
  steps.push("sale", "fee", "size", "category", "contents", "places", "people", "review");
  return steps;
}

/** Local checks before "Continue". The server checks everything again. */
function stepErrors(step: Step, draft: OrderDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const required = "errors.required";
  if (step === "where") {
    if (!draft.type) errors.type = required;
    if (!draft.originCityId) errors.originCityId = required;
    if (draft.type === "intercity" && !draft.destinationCityId) errors.destinationCityId = required;
  }
  if (step === "arrive" && !draft.intercityMode) errors.intercityMode = required;
  if (step === "sale") {
    if (!draft.sale) errors.sale = required;
    if (draft.sale === "receiver_pays" && !Number(draft.goodsAmount)) errors.goodsAmount = "errors.amount";
  }
  if (step === "fee") {
    if (!draft.feeTiming) errors.feeTiming = required;
    else if (!draft.feeMethod) errors.feeMethod = required;
  }
  if (step === "size" && !draft.size) errors.size = required;
  if (step === "category" && !draft.category) errors.category = required;
  if (step === "contents") {
    if (!draft.contents.trim()) errors.contents = required;
    if (!Number(draft.itemCount)) errors.itemCount = "errors.number";
    if (!draft.declarationAccepted) errors.declarationAccepted = "errors.declaration";
  }
  if (step === "places") {
    if (!draft.pickup.text.trim()) errors.pickup = required;
    if (!draft.dropoff.text.trim()) errors.dropoff = required;
  }
  if (step === "people") {
    if (!draft.senderName.trim()) errors.senderName = required;
    if (!draft.senderPhone.trim()) errors.senderPhone = required;
    if (!draft.receiverName.trim()) errors.receiverName = required;
    if (!draft.receiverPhone.trim()) errors.receiverPhone = required;
  }
  return errors;
}

/** Which screen shows a field returned with an error by the server. */
const FIELD_STEP: Record<string, Step> = {
  type: "where",
  originCityId: "where",
  destinationCityId: "where",
  intercityMode: "arrive",
  goodsStatus: "sale",
  goodsAmount: "sale",
  feeTiming: "fee",
  feeMethod: "fee",
  size: "size",
  category: "category",
  contents: "contents",
  itemCount: "contents",
  estimatedValue: "contents",
  declarationAccepted: "contents",
  pickup: "places",
  dropoff: "places",
  sender: "people",
  senderPhone: "people",
  receiver: "people",
  receiverPhone: "people",
};

export function RequestWizard({ cities, defaults }: { cities: City[]; defaults: { senderName: string; senderPhone: string; originCityId: string } }) {
  const { t, tx } = useT();
  const router = useRouter();
  const { run, pending, error, errorValues, fields } = useAction("/account/login");
  const [draft, setDraft] = useState<OrderDraft>(() => emptyDraft(defaults));
  const [index, setIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = stepsFor(draft);
  const step = steps[Math.min(index, steps.length - 1)];
  const questionCount = steps.length - 1;
  const destinationName = cities.find((city) => city.id === draft.destinationCityId)?.name ?? "";
  const originName = cities.find((city) => city.id === draft.originCityId)?.name ?? "";

  function update(changes: Partial<OrderDraft>) {
    setDraft((current) => cleanDraft({ ...current, ...changes }));
    setErrors({});
  }

  function next() {
    const found = stepErrors(step, draft);
    if (Object.keys(found).length > 0) return setErrors(found);
    setErrors({});
    setIndex(index + 1);
    window.scrollTo({ top: 0 });
  }

  function back() {
    if (index === 0) return router.push("/");
    setErrors({});
    setIndex(index - 1);
  }

  function send() {
    run("createOrder", () => createWebOrderAction(draftToInput(draft)), (result) => {
      router.push(result.guestToken ? `/o/${result.guestToken}` : `/orders/${result.number}`);
    });
  }

  /** Server field errors: go back to the first screen with a problem and highlight the fields. */
  function fixServerErrors() {
    const mapped: Record<string, string> = {};
    for (const [field, key] of Object.entries(fields)) {
      if (field === "sender") mapped.senderName = key;
      else if (field === "receiver") mapped.receiverName = key;
      else mapped[field] = key;
    }
    const firstStep = steps.find((candidate) => Object.keys(fields).some((field) => FIELD_STEP[field] === candidate));
    if (firstStep) setIndex(steps.indexOf(firstStep));
    setErrors(mapped);
  }

  const titles: Record<Step, string> = {
    where: t("form.q.where"),
    arrive: t("form.q.arrive"),
    sale: t("form.q.sale"),
    fee: t("form.q.fee"),
    size: t("form.q.size"),
    category: t("form.q.category"),
    contents: t("form.q.contents"),
    places: t("form.q.places"),
    people: t("form.q.people"),
    review: t("form.q.review"),
  };
  const intros: Partial<Record<Step, string>> = {
    where: t("form.pickOne"),
    arrive: t("form.arriveIntro"),
    sale: t("form.saleIntro"),
    category: t("form.categoryIntro"),
    contents: t("form.contentsIntro"),
    places: t("form.placesIntro"),
  };

  const summary = orderSummary(
    {
      type: draft.type ?? "local",
      intercityMode: draft.intercityMode,
      destinationCityName: destinationName,
      goods: { isSale: draft.sale === "already_paid" || draft.sale === "receiver_pays", status: draft.sale === "no" ? null : draft.sale, amount: Number(draft.goodsAmount) || 0 },
      fee: { timing: draft.feeTiming ?? "pickup", method: draft.feeMethod ?? "cash" },
    },
    tx,
  );

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 pt-2 pb-6">
      {step !== "review" && (
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: questionCount }, (_, position) => (
            <span key={position} className={`h-1.5 flex-1 rounded-full ${position <= index ? "bg-navy" : "bg-cloud"}`} />
          ))}
        </div>
      )}
      <button type="button" onClick={back} className="inline-flex min-h-10 items-center gap-1 self-start text-sm font-bold text-muted">
        <IconBack size={16} />
        {t("common.back")}
        {step !== "review" && <span> · {t("form.questionOf", { n: index + 1, total: questionCount })}</span>}
      </button>
      <div>
        <h1 className="text-[26px] leading-tight font-extrabold">{titles[step]}</h1>
        {intros[step] && <p className="mt-1 text-sm text-muted">{intros[step]}</p>}
      </div>

      <div key={step} className="animate-rise">
        {step === "where" && <WhereQuestion draft={draft} update={update} errors={errors} cities={cities} />}
        {step === "arrive" && <ArriveQuestion draft={draft} update={update} errors={errors} destinationName={destinationName} />}
        {step === "sale" && <SaleQuestion draft={draft} update={update} errors={errors} />}
        {step === "fee" && <FeeQuestion draft={draft} update={update} errors={errors} />}
        {step === "size" && <SizeQuestion draft={draft} update={update} errors={errors} />}
        {step === "category" && <CategoryQuestion draft={draft} update={update} errors={errors} />}
        {step === "contents" && <ContentsQuestion draft={draft} update={update} errors={errors} />}
        {step === "places" && <PlacesQuestion draft={draft} update={update} errors={errors} />}
        {step === "people" && <PeopleQuestion draft={draft} update={update} errors={errors} />}
        {step === "review" && (
          <div className="flex flex-col gap-3">
            <Card className="flex flex-col gap-2 text-[15px]">
              <p className="font-extrabold">{summary}</p>
              <p>
                {draft.type === "intercity" ? `${originName} → ${destinationName}` : originName} · {draft.pickup.text} → {draft.dropoff.text}
              </p>
              <p>{t(`size.${draft.size ?? "small"}`)} · {t(`category.${draft.category ?? "other"}`)}: {draft.contents} ({draft.itemCount})</p>
              <p>{t("order.sender")}: {draft.senderName} · {draft.senderPhone}</p>
              <p>{t("order.receiver")}: {draft.receiverName} · {draft.receiverPhone}</p>
              <p className="text-sm text-green-ink">✓ {t("form.declarationConfirmed")}</p>
            </Card>
            <Notice tone="warning">{t("form.weWillCall")}</Notice>
            {error && (
              <Notice tone="error">
                <p>{tx(error, errorValues)}</p>
                {Object.keys(fields).length > 0 && (
                  <button type="button" className="mt-2 min-h-10 underline" onClick={fixServerErrors}>
                    {t("form.reviewAnswers")}
                  </button>
                )}
              </Notice>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto pt-4">
        {step === "review" ? (
          <Button variant="action" className="w-full" disabled={pending} onClick={send}>
            {pending ? t("common.wait") : t("form.send")}
          </Button>
        ) : (
          <Button variant="action" className="w-full" onClick={next}>
            {t("form.continue")}
          </Button>
        )}
      </div>
    </div>
  );
}
