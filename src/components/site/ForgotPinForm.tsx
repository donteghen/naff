"use client";

import Link from "next/link";
import { useState } from "react";
import { forgotPinAction } from "@/actions/site";
import { useT } from "@/i18n/client";
import { useAction } from "../use-action";
import { Button, Field, Notice, inputClass } from "../ui";

export function ForgotPinForm() {
  const { t, tx } = useT();
  const { run, pending, error, fields } = useAction();
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="success">{t("site.resetSent")}</Notice>
        <Link href="/account/login" className="min-h-11 text-center font-bold text-indigo">{t("site.backToLogin")}</Link>
      </div>
    );
  }
  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); run("forgotPin", () => forgotPinAction({ phone }), () => setSent(true)); }}>
      <Field label={t("auth.phone")} error={fields.phone ? tx(fields.phone) : undefined}>
        <input className={inputClass(Boolean(fields.phone))} type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required />
      </Field>
      {error && error !== "errors.checkForm" && <Notice tone="error">{tx(error)}</Notice>}
      <Button type="submit" variant="action" disabled={pending}>{pending ? t("common.wait") : t("site.sendTempPin")}</Button>
    </form>
  );
}
