"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import type { ActionResult } from "@/server/errors";
import { useAction } from "../use-action";
import { Button, Notice } from "../ui";
import { TempPin } from "./PersonForm";

/** Reset PIN, log out everywhere, deactivate / reactivate. Used for users, drivers and admins. */
export function AccountActions({
  active,
  resetPin,
  endSessions,
  setActive,
  deactivateLabel,
}: {
  active: boolean;
  resetPin?: () => Promise<ActionResult<string>>;
  endSessions?: () => Promise<ActionResult<void>>;
  setActive?: (active: boolean) => Promise<ActionResult<void>>;
  deactivateLabel: string;
}) {
  const { t, tx } = useT();
  const { run, pending, error, errorValues } = useAction();
  const [tempPin, setTempPin] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState<"" | "pin" | "sessions" | "active">("");

  if (tempPin) return <TempPin pin={tempPin} onClose={() => setTempPin(null)} />;

  function confirm(kind: "pin" | "sessions" | "active") {
    setMessage("");
    if (confirming !== kind) return setConfirming(kind);
    setConfirming("");
    if (kind === "pin" && resetPin) run("resetPin", resetPin, (pin) => setTempPin(pin));
    if (kind === "sessions" && endSessions) run("endSessions", endSessions, () => setMessage(t("people.sessionsEnded")));
    if (kind === "active" && setActive) run("setActive", () => setActive(!active), () => setMessage(t("common.saved")));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {resetPin && <Button size="sm" variant="secondary" disabled={pending} onClick={() => confirm("pin")}>{confirming === "pin" ? t("common.confirmQuestion") : t("people.resetPin")}</Button>}
        {endSessions && <Button size="sm" variant="secondary" disabled={pending} onClick={() => confirm("sessions")}>{confirming === "sessions" ? t("common.confirmQuestion") : t("people.endSessions")}</Button>}
        {setActive && (
          <Button size="sm" variant={active ? "danger" : "success"} disabled={pending} onClick={() => confirm("active")}>
            {confirming === "active" ? t("common.confirmQuestion") : active ? deactivateLabel : t("people.reactivate")}
          </Button>
        )}
      </div>
      {error && <Notice tone="error">{tx(error, errorValues)}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
    </div>
  );
}
