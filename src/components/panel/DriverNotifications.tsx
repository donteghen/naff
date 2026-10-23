"use client";

import { useState } from "react";
import { sendDriverTestAction } from "@/actions/panel-admin";
import { useT } from "@/i18n/client";
import { CopyButton } from "../CopyButton";
import { useAction } from "../use-action";
import { Button, Card, Notice, SectionLabel } from "../ui";

/** How the driver subscribes to their job notifications in the ntfy app (SPEC §9.2). */
export function DriverNotifications({ driverId, topic, server }: { driverId: string; topic: string; server: string }) {
  const { t, tx } = useT();
  const { run, pending, error } = useAction();
  const [sent, setSent] = useState(false);
  return (
    <Card className="flex flex-col gap-3">
      <SectionLabel>{t("ntfySetup.title")}</SectionLabel>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>{t("ntfySetup.step1")}</li>
        <li>{t("ntfySetup.step2")}</li>
        <li>{t("ntfySetup.step3", { server })}</li>
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-xl bg-mist px-3 py-2 text-sm font-bold break-all">{topic}</code>
        <CopyButton text={topic} label={t("ntfySetup.copy")} size="sm" />
      </div>
      <p className="text-xs text-muted">{t("ntfySetup.secret")}</p>
      {error && <Notice tone="error">{tx(error)}</Notice>}
      {sent && !error && <Notice tone="success">{t("ntfySetup.testSent")}</Notice>}
      <Button size="sm" variant="secondary" className="self-start" disabled={pending} onClick={() => { setSent(false); run("sendDriverTest", () => sendDriverTestAction(driverId), () => setSent(true)); }}>
        {t("ntfySetup.sendTest")}
      </Button>
    </Card>
  );
}
