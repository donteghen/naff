"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import type { ActionResult } from "@/server/errors";
import { useAction } from "../use-action";
import { Button, Field, Notice, inputClass } from "../ui";

type Values = { name: string; phone: string; email?: string; cityId?: string };

/**
 * Name / phone (/ email or city) form used for users, drivers and admins.
 * When the action returns a temporary PIN, it is shown once.
 */
export function PersonForm({
  initial,
  withEmail = false,
  emailRequired = false,
  cities,
  submit,
  submitLabel,
  onDone,
}: {
  initial: Values;
  withEmail?: boolean;
  emailRequired?: boolean;
  cities?: { id: string; name: string }[];
  submit: (values: Values) => Promise<ActionResult<string | void>>;
  submitLabel: string;
  onDone?: () => void;
}) {
  const { t, tx } = useT();
  const { run, pending, error, errorValues, fields } = useAction();
  const [values, setValues] = useState<Values>(initial);
  const [tempPin, setTempPin] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = (key: keyof Values, value: string) => { setSaved(false); setValues((current) => ({ ...current, [key]: value })); };

  if (tempPin) return <TempPin pin={tempPin} onClose={() => { setTempPin(null); onDone?.(); }} />;

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        run("savePerson", () => submit(values), (result) => {
          if (typeof result === "string") setTempPin(result);
          else { setSaved(true); onDone?.(); }
        });
      }}
    >
      <Field label={t("form.name")} error={fields.name ? tx(fields.name) : undefined}>
        <input className={inputClass(Boolean(fields.name))} value={values.name} onChange={(event) => set("name", event.target.value)} required />
      </Field>
      <Field label={t("auth.phone")} error={fields.phone ? tx(fields.phone) : undefined}>
        <input className={inputClass(Boolean(fields.phone))} type="tel" value={values.phone} onChange={(event) => set("phone", event.target.value)} required />
      </Field>
      {withEmail && (
        <Field label={emailRequired ? t("site.email") : `${t("site.email")} (${t("common.optional")})`} error={fields.email ? tx(fields.email) : undefined} hint={emailRequired ? undefined : t("admins.emailHint")}>
          <input className={inputClass(Boolean(fields.email))} type="email" value={values.email ?? ""} onChange={(event) => set("email", event.target.value)} required={emailRequired} />
        </Field>
      )}
      {cities && (
        <Field label={t("orders.city")} error={fields.cityId ? tx(fields.cityId) : undefined}>
          <select className={inputClass(Boolean(fields.cityId))} value={values.cityId ?? ""} onChange={(event) => set("cityId", event.target.value)} required>
            <option value="">{t("common.choose")}</option>
            {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </select>
        </Field>
      )}
      <div className="flex flex-col gap-2 sm:col-span-2">
        {error && error !== "errors.checkForm" && <Notice tone="error">{tx(error, errorValues)}</Notice>}
        {saved && <Notice tone="success">{t("common.saved")}</Notice>}
        <Button type="submit" size="md" disabled={pending}>{pending ? t("common.wait") : submitLabel}</Button>
      </div>
    </form>
  );
}

/** A temporary PIN, shown once. The admin passes it on by phone. */
export function TempPin({ pin, onClose }: { pin: string; onClose: () => void }) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-amber-soft p-5 text-center">
      <p className="text-sm font-bold">{t("people.tempPinTitle")}</p>
      <p className="text-4xl font-extrabold tracking-[0.3em] tabular-nums">{pin}</p>
      <p className="text-xs">{t("people.tempPinNote")}</p>
      <Button size="md" variant="primary" onClick={onClose}>{t("people.tempPinDone")}</Button>
    </div>
  );
}
