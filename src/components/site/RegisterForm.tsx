"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerUserAction } from "@/actions/site";
import { useT } from "@/i18n/client";
import { USER_PIN_LENGTH } from "@/lib/constants";
import { useAction } from "../use-action";
import { Button, Field, Notice, inputClass } from "../ui";

export function RegisterForm() {
  const { t, tx } = useT();
  const router = useRouter();
  const { run, pending, error, fields } = useAction("/account/login");
  const [form, setForm] = useState({ name: "", phone: "", email: "", pin: "", confirmPin: "" });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const fieldError = (key: string) => (fields[key] ? tx(fields[key]) : undefined);
  const pinInput = { type: "password", inputMode: "numeric" as const, maxLength: USER_PIN_LENGTH, autoComplete: "new-password" };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        run("register", () => registerUserAction(form), () => router.push("/"));
      }}
    >
      <Field label={t("form.name")} error={fieldError("name")}>
        <input className={inputClass(Boolean(fields.name))} value={form.name} onChange={(event) => set("name", event.target.value)} autoComplete="name" required />
      </Field>
      <Field label={t("auth.phone")} error={fieldError("phone")}>
        <input className={inputClass(Boolean(fields.phone))} type="tel" inputMode="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} placeholder="+237 6XX XX XX XX" autoComplete="tel" required />
      </Field>
      <Field label={t("site.email")} hint={t("site.emailHint")} error={fieldError("email")}>
        <input className={inputClass(Boolean(fields.email))} type="email" value={form.email} onChange={(event) => set("email", event.target.value)} autoComplete="email" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("auth.pin")} error={fieldError("pin")}>
          <input {...pinInput} className={`${inputClass(Boolean(fields.pin))} tracking-[0.4em]`} value={form.pin} onChange={(event) => set("pin", event.target.value.replace(/\D/g, ""))} required />
        </Field>
        <Field label={t("auth.confirmPin")} error={fieldError("confirmPin")}>
          <input {...pinInput} className={`${inputClass(Boolean(fields.confirmPin))} tracking-[0.4em]`} value={form.confirmPin} onChange={(event) => set("confirmPin", event.target.value.replace(/\D/g, ""))} required />
        </Field>
      </div>
      {error && error !== "errors.checkForm" && <Notice tone="error">{tx(error)}</Notice>}
      <Button type="submit" variant="action" disabled={pending}>{pending ? t("common.wait") : t("site.createAccount")}</Button>
      <Link href="/account/login" className="min-h-10 text-center text-sm font-bold">{t("site.haveAccount")}</Link>
    </form>
  );
}
