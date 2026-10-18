"use client";

import { useState } from "react";
import { updateProfileAction } from "@/actions/site";
import { useT } from "@/i18n/client";
import { useAction } from "../use-action";
import { Button, Field, Notice, inputClass } from "../ui";

export function ProfileForm({ initial }: { initial: { name: string; phone: string; email: string } }) {
  const { t, tx } = useT();
  const { run, pending, error, fields } = useAction("/account/login");
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const set = (key: keyof typeof form, value: string) => { setSaved(false); setForm((current) => ({ ...current, [key]: value })); };
  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); run("updateProfile", () => updateProfileAction(form), () => setSaved(true)); }}>
      <Field label={t("form.name")} error={fields.name ? tx(fields.name) : undefined}>
        <input className={inputClass(Boolean(fields.name))} value={form.name} onChange={(event) => set("name", event.target.value)} />
      </Field>
      <Field label={t("auth.phone")} error={fields.phone ? tx(fields.phone) : undefined}>
        <input className={inputClass(Boolean(fields.phone))} type="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} />
      </Field>
      <Field label={t("site.email")} error={fields.email ? tx(fields.email) : undefined}>
        <input className={inputClass(Boolean(fields.email))} type="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
      </Field>
      {error && error !== "errors.checkForm" && <Notice tone="error">{tx(error)}</Notice>}
      {saved && <Notice tone="success">{t("common.saved")}</Notice>}
      <Button type="submit" variant="primary" size="md" disabled={pending}>{pending ? t("common.wait") : t("common.save")}</Button>
    </form>
  );
}
