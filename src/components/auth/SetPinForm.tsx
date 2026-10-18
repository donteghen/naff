"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/client";
import type { ActionResult } from "@/server/errors";
import { useAction } from "../use-action";
import { Button, Field, Notice, inputClass } from "../ui";

/** New PIN form: forced after a temporary PIN, or a normal "change my PIN" (current PIN required). */
export function SetPinForm({
  action,
  pinLength,
  requireCurrent,
  afterSave,
  loginPath,
}: {
  action: (input: { currentPin?: string; newPin: string; confirmPin: string }) => Promise<ActionResult<void>>;
  pinLength: number;
  requireCurrent: boolean;
  afterSave?: string;
  loginPath: string;
}) {
  const { t, tx } = useT();
  const router = useRouter();
  const { run, pending, error, errorValues, fields } = useAction(loginPath);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saved, setSaved] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    run("setPin", () => action({ currentPin: requireCurrent ? currentPin : undefined, newPin, confirmPin }), () => {
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setSaved(true);
      if (afterSave) router.push(afterSave);
    });
  }

  const pinProps = {
    type: "password",
    inputMode: "numeric" as const,
    maxLength: pinLength,
    className: `${inputClass()} tracking-[0.5em]`,
    required: true,
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {requireCurrent && (
        <Field label={t("auth.currentPin")} error={fields.currentPin ? tx(fields.currentPin) : undefined}>
          <input {...pinProps} autoComplete="current-password" value={currentPin} onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ""))} />
        </Field>
      )}
      <Field label={t("auth.newPin")} hint={t("auth.pinDigits", { count: pinLength })} error={fields.newPin ? tx(fields.newPin) : undefined}>
        <input {...pinProps} autoComplete="new-password" value={newPin} onChange={(event) => setNewPin(event.target.value.replace(/\D/g, ""))} />
      </Field>
      <Field label={t("auth.confirmPin")} error={fields.confirmPin ? tx(fields.confirmPin) : undefined}>
        <input {...pinProps} autoComplete="new-password" value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, ""))} />
      </Field>
      {error && error !== "errors.checkForm" && <Notice tone="error">{tx(error, errorValues)}</Notice>}
      {saved && !afterSave && <Notice tone="success">{t("auth.pinSaved")}</Notice>}
      <Button type="submit" variant="action" disabled={pending}>
        {pending ? t("common.wait") : t("auth.savePin")}
      </Button>
    </form>
  );
}
