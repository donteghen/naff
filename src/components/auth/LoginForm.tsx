"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useT } from "@/i18n/client";
import type { ActionResult } from "@/server/errors";
import { useAction } from "../use-action";
import { Button, Field, Notice, inputClass } from "../ui";

/** Phone + PIN login, used by the three apps. */
export function LoginForm({
  action,
  pinLength,
  afterLogin,
  setPinPath,
  ended = false,
  footer,
}: {
  action: (input: { phone: string; pin: string }) => Promise<ActionResult<{ mustChangePin: boolean }>>;
  pinLength: number;
  afterLogin: string;
  setPinPath: string;
  ended?: boolean;
  footer?: ReactNode;
}) {
  const { t, tx } = useT();
  const router = useRouter();
  const { run, pending, error, errorValues } = useAction();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    run("login", () => action({ phone, pin }), (result) => {
      router.push(result.mustChangePin ? setPinPath : afterLogin);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {ended && !error && <Notice tone="info">{t("auth.sessionEnded")}</Notice>}
      <Field label={t("auth.phone")}>
        <input className={inputClass()} type="tel" inputMode="tel" autoComplete="tel" placeholder="+237 6XX XX XX XX" value={phone} onChange={(event) => setPhone(event.target.value)} required />
      </Field>
      <Field label={t("auth.pin")} hint={t("auth.pinDigits", { count: pinLength })}>
        <input
          className={`${inputClass()} tracking-[0.5em]`}
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={pinLength}
          pattern={`\\d{${pinLength}}`}
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          required
        />
      </Field>
      {error && <Notice tone="error">{tx(error, errorValues)}</Notice>}
      <Button type="submit" variant="action" disabled={pending}>
        {pending ? t("common.wait") : t("auth.login")}
      </Button>
      {footer}
    </form>
  );
}
