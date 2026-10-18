"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useT } from "@/i18n/client";
import { PARCEL_CATEGORIES, PARCEL_SIZES } from "@/lib/constants";
import { feeTimingOptions, methodOptions, saleOptions, type OrderDraft } from "@/lib/order-form";
import { IconBox, IconPin, IconTruck, IconUser } from "../Icons";
import { Field, inputClass } from "../ui";
import { PlaceField } from "./PlaceField";

export type QuestionProps = {
  draft: OrderDraft;
  update: (changes: Partial<OrderDraft>) => void;
  errors: Record<string, string>;
  compact?: boolean;
};

type City = { id: string; name: string };

/** Radio card from the designs: icon, title, hint and a round marker. */
export function OptionCard({ selected, onSelect, title, hint, icon, compact = false }: { selected: boolean; onSelect: () => void; title: string; hint?: string; icon?: ReactNode; compact?: boolean }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`press flex w-full items-center gap-3 rounded-[18px] bg-white text-left shadow-[var(--shadow-card)] ${compact ? "min-h-12 px-3 py-2" : "min-h-[68px] p-3.5"} ${selected ? "shadow-[inset_0_0_0_2px_var(--color-navy),var(--shadow-card)]" : ""}`}
    >
      {icon && <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-amber text-navy" : "bg-indigo-tint text-navy"}`}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold">{title}</span>
        {hint && <span className="block text-[13px] text-muted">{hint}</span>}
      </span>
      <span className={`h-6 w-6 shrink-0 rounded-full ${selected ? "border-[7px] border-navy" : "border-2 border-field"}`} aria-hidden="true" />
    </button>
  );
}

function ErrorText({ error }: { error?: string }) {
  const { tx } = useT();
  if (!error) return null;
  return <p className="text-sm font-bold text-red">{tx(error)}</p>;
}

function Group({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return <div role="radiogroup" className={compact ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "flex flex-col gap-2.5"}>{children}</div>;
}

export function WhereQuestion({ draft, update, errors, compact, cities }: QuestionProps & { cities: City[] }) {
  const { t, tx } = useT();
  return (
    <div className="flex flex-col gap-3">
      <Group compact={compact}>
        <OptionCard compact={compact} selected={draft.type === "local"} onSelect={() => update({ type: "local" })} title={t("form.sameCity")} hint={t("form.sameCityHint")} icon={<IconPin size={20} />} />
        <OptionCard compact={compact} selected={draft.type === "intercity"} onSelect={() => update({ type: "intercity" })} title={t("form.anotherTown")} hint={t("form.anotherTownHint")} icon={<IconTruck size={20} />} />
      </Group>
      <ErrorText error={errors.type} />
      {draft.type && (
        <div className={`grid gap-3 ${draft.type === "intercity" ? "grid-cols-2" : "grid-cols-1"}`}>
          <Field label={draft.type === "local" ? t("form.city") : t("form.fromCity")} error={errors.originCityId ? tx(errors.originCityId) : undefined}>
            <select className={inputClass(Boolean(errors.originCityId))} value={draft.originCityId} onChange={(event) => update({ originCityId: event.target.value })}>
              <option value="">{t("common.choose")}</option>
              {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
          </Field>
          {draft.type === "intercity" && (
            <Field label={t("form.toCity")} error={errors.destinationCityId ? tx(errors.destinationCityId) : undefined}>
              <select className={inputClass(Boolean(errors.destinationCityId))} value={draft.destinationCityId} onChange={(event) => update({ destinationCityId: event.target.value })}>
                <option value="">{t("common.choose")}</option>
                {cities.filter((city) => city.id !== draft.originCityId).map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
              </select>
            </Field>
          )}
        </div>
      )}
    </div>
  );
}

export function ArriveQuestion({ draft, update, errors, compact, destinationName }: QuestionProps & { destinationName: string }) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-2">
      <Group compact={compact}>
        <OptionCard compact={compact} selected={draft.intercityMode === "to_address"} onSelect={() => update({ intercityMode: "to_address" })} title={t("form.toAddress")} hint={t("form.toAddressHint")} icon={<IconPin size={20} />} />
        <OptionCard compact={compact} selected={draft.intercityMode === "collect_at_agency"} onSelect={() => update({ intercityMode: "collect_at_agency" })} title={t("form.collectAtAgency")} hint={t("form.collectAtAgencyHint", { city: destinationName || "…" })} icon={<IconBox size={20} />} />
      </Group>
      <ErrorText error={errors.intercityMode} />
    </div>
  );
}

export function SaleQuestion({ draft, update, errors, compact }: QuestionProps) {
  const { t, tx } = useT();
  const options = saleOptions(draft.type);
  return (
    <div className="flex flex-col gap-3">
      <Group compact={compact}>
        {options.map((option) => (
          <OptionCard key={option} compact={compact} selected={draft.sale === option} onSelect={() => update({ sale: option })} title={t(`form.sale.${option}`)} />
        ))}
      </Group>
      {draft.type === "intercity" && <p className="text-xs font-bold text-muted">{t("form.saleIntercityNote")}</p>}
      <ErrorText error={errors.goodsStatus ?? errors.sale} />
      {(draft.sale === "receiver_pays" || draft.sale === "already_paid") && (
        <Field label={draft.sale === "receiver_pays" ? t("form.goodsAmount") : t("form.goodsAmountOptional")} error={errors.goodsAmount ? tx(errors.goodsAmount) : undefined}>
          <input className={inputClass(Boolean(errors.goodsAmount))} inputMode="numeric" value={draft.goodsAmount} onChange={(event) => update({ goodsAmount: event.target.value.replace(/[^\d]/g, "") })} placeholder="15000" />
        </Field>
      )}
    </div>
  );
}

export function FeeQuestion({ draft, update, errors, compact }: QuestionProps) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-3">
      <Group compact={compact}>
        {feeTimingOptions(draft.type).map((timing) => (
          <OptionCard
            key={timing}
            compact={compact}
            selected={draft.feeTiming === timing}
            onSelect={() => update({ feeTiming: timing })}
            title={t(`form.fee.${timing}`)}
            hint={t(`form.fee.${timing}Hint`)}
            icon={<IconUser size={20} />}
          />
        ))}
      </Group>
      {draft.type === "intercity" && <p className="text-xs font-bold text-muted">{t("form.feeIntercityNote")}</p>}
      <ErrorText error={errors.feeTiming} />
      {draft.feeTiming && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">{t("form.method")}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {methodOptions(draft.feeTiming).map((method) => (
              <button
                key={method}
                type="button"
                role="radio"
                aria-checked={draft.feeMethod === method}
                onClick={() => update({ feeMethod: method })}
                className={`min-h-11 rounded-full px-4 text-sm font-extrabold ${draft.feeMethod === method ? "bg-navy text-white" : "bg-white text-navy shadow-[inset_0_0_0_2px_var(--color-field)]"}`}
              >
                {t(`method.${method}`)}
              </button>
            ))}
          </div>
          <ErrorText error={errors.feeMethod} />
        </div>
      )}
    </div>
  );
}

export function SizeQuestion({ draft, update, errors, compact }: QuestionProps) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-2">
      <Group compact={compact}>
        {PARCEL_SIZES.map((size) => (
          <OptionCard key={size} compact={compact} selected={draft.size === size} onSelect={() => update({ size })} title={t(`size.${size}`)} hint={t(`size.${size}Hint`)} icon={<IconBox size={20} />} />
        ))}
      </Group>
      <ErrorText error={errors.size} />
    </div>
  );
}

export function CategoryQuestion({ draft, update, errors }: QuestionProps) {
  const { t } = useT();
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {PARCEL_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            role="radio"
            aria-checked={draft.category === category}
            onClick={() => update({ category })}
            className={`press flex min-h-[76px] flex-col items-start justify-between gap-2 rounded-[18px] p-3 text-left text-sm font-extrabold shadow-[var(--shadow-card)] ${draft.category === category ? "bg-amber-soft shadow-[inset_0_0_0_2px_var(--color-amber),var(--shadow-card)]" : "bg-white"}`}
          >
            <IconBox size={18} />
            {t(`category.${category}`)}
          </button>
        ))}
      </div>
      {draft.category === "medicine" && <p className="rounded-2xl bg-indigo-tint p-3 text-xs font-bold text-indigo">{t("form.medicineHint")}</p>}
      <ErrorText error={errors.category} />
    </div>
  );
}

export function ContentsQuestion({ draft, update, errors, showForbiddenLink = true }: QuestionProps & { showForbiddenLink?: boolean }) {
  const { t, tx } = useT();
  return (
    <div className="flex flex-col gap-3">
      <Field label={t("form.contents")} error={errors.contents ? tx(errors.contents) : undefined}>
        <input className={inputClass(Boolean(errors.contents))} value={draft.contents} onChange={(event) => update({ contents: event.target.value })} placeholder={t("form.contentsPlaceholder")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("form.itemCount")} error={errors.itemCount ? tx(errors.itemCount) : undefined}>
          <input className={inputClass(Boolean(errors.itemCount))} inputMode="numeric" value={draft.itemCount} onChange={(event) => update({ itemCount: event.target.value.replace(/[^\d]/g, "") })} />
        </Field>
        <Field label={t("form.estimatedValue")} error={errors.estimatedValue ? tx(errors.estimatedValue) : undefined}>
          <input className={inputClass()} inputMode="numeric" value={draft.estimatedValue} onChange={(event) => update({ estimatedValue: event.target.value.replace(/[^\d]/g, "") })} placeholder={t("common.optional")} />
        </Field>
      </div>
      <label className={`flex items-start gap-3 rounded-2xl bg-white p-3.5 shadow-[var(--shadow-card)] ${errors.declarationAccepted ? "shadow-[inset_0_0_0_2px_var(--color-red)]" : ""}`}>
        <input type="checkbox" className="mt-0.5 h-6 w-6 shrink-0 accent-[#0B1B3F]" checked={draft.declarationAccepted} onChange={(event) => update({ declarationAccepted: event.target.checked })} />
        <span className="text-sm">
          <b>{t("form.declarationTitle")}</b> {t("form.declarationBody")}
        </span>
      </label>
      <ErrorText error={errors.declarationAccepted} />
      {showForbiddenLink && <Link href="/forbidden" target="_blank" className="text-sm font-bold text-indigo underline">{t("form.seeForbidden")}</Link>}
    </div>
  );
}

export function PlacesQuestion({ draft, update, errors }: QuestionProps) {
  const { t, tx } = useT();
  return (
    <div className="flex flex-col gap-5">
      <PlaceField label={t("order.pickup")} value={draft.pickup} onChange={(pickup) => update({ pickup })} error={errors.pickup ? tx(errors.pickup) : undefined} />
      <PlaceField label={t("order.dropoff")} value={draft.dropoff} onChange={(dropoff) => update({ dropoff })} error={errors.dropoff ? tx(errors.dropoff) : undefined} />
    </div>
  );
}

export function PeopleQuestion({ draft, update, errors, showSender = true }: QuestionProps & { showSender?: boolean }) {
  const { t, tx } = useT();
  return (
    <div className="flex flex-col gap-4">
      {showSender && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-xs font-extrabold text-muted uppercase">{t("order.sender")}</legend>
          <Field label={t("form.name")} error={errors.senderName ? tx(errors.senderName) : undefined}>
            <input className={inputClass(Boolean(errors.senderName))} value={draft.senderName} onChange={(event) => update({ senderName: event.target.value })} autoComplete="name" />
          </Field>
          <Field label={t("form.phone")} error={errors.senderPhone ? tx(errors.senderPhone) : undefined}>
            <input className={inputClass(Boolean(errors.senderPhone))} type="tel" inputMode="tel" value={draft.senderPhone} onChange={(event) => update({ senderPhone: event.target.value })} placeholder="+237 6XX XX XX XX" autoComplete="tel" />
          </Field>
        </fieldset>
      )}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-xs font-extrabold text-muted uppercase">{t("order.receiver")}</legend>
        <Field label={t("form.receiverName")} error={errors.receiverName ? tx(errors.receiverName) : undefined}>
          <input className={inputClass(Boolean(errors.receiverName))} value={draft.receiverName} onChange={(event) => update({ receiverName: event.target.value })} />
        </Field>
        <Field label={t("form.receiverPhone")} error={errors.receiverPhone ? tx(errors.receiverPhone) : undefined}>
          <input className={inputClass(Boolean(errors.receiverPhone))} type="tel" inputMode="tel" value={draft.receiverPhone} onChange={(event) => update({ receiverPhone: event.target.value })} placeholder="+237 6XX XX XX XX" />
        </Field>
      </fieldset>
    </div>
  );
}
