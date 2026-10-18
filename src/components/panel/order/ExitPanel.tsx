"use client";

import { useState } from "react";
import { cancelOrderAction, failOrderAction, issueAction } from "@/actions/panel-orders";
import { useT } from "@/i18n/client";
import { CANCELLABLE_STATUSES, FAILABLE_STATUSES } from "@/lib/constants";
import type { AdminOrderView } from "@/server/services/order-views";
import { IconFlag } from "../../Icons";
import { useAction } from "../../use-action";
import { Button, Field, Notice, inputClass } from "../../ui";

/** Issue flag (admin marker), cancel before pickup, fail after pickup. Reasons are required. */
export function ExitPanel({ order }: { order: AdminOrderView }) {
  const { t, tx } = useT();
  const { run, pending, error, errorValues } = useAction();
  const [mode, setMode] = useState<"none" | "issue" | "cancel" | "fail">("none");
  const [text, setText] = useState("");
  const canCancel = CANCELLABLE_STATUSES.includes(order.status);
  const canFail = FAILABLE_STATUSES.includes(order.status);
  const finished = ["delivered", "cancelled", "failed"].includes(order.status);
  if (finished) return null;

  function submit() {
    const done = () => { setMode("none"); setText(""); };
    if (mode === "issue") run("issue", () => issueAction(order.id, true, text), done);
    if (mode === "cancel") run("cancel", () => cancelOrderAction(order.id, text), done);
    if (mode === "fail") run("fail", () => failOrderAction(order.id, text), done);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {order.issue.open ? (
          <Button size="md" variant="secondary" disabled={pending} onClick={() => run("clearIssue", () => issueAction(order.id, false, ""))}><IconFlag size={16} />{t("exit.clearIssue")}</Button>
        ) : (
          <Button size="md" variant="secondary" onClick={() => setMode("issue")}><IconFlag size={16} />{t("exit.flagIssue")}</Button>
        )}
        {canCancel && <Button size="md" variant="danger" onClick={() => setMode("cancel")}>{t("exit.cancel")}</Button>}
        {canFail && <Button size="md" variant="danger" onClick={() => setMode("fail")}>{t("exit.fail")}</Button>}
      </div>
      {mode !== "none" && (
        <div className="flex flex-col gap-2 rounded-2xl bg-mist p-3">
          <Field label={mode === "issue" ? t("exit.issueNote") : t("exit.reason")}>
            <input className={inputClass()} value={text} onChange={(event) => setText(event.target.value)} autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Button size="md" variant="secondary" onClick={() => { setMode("none"); setText(""); }}>{t("common.cancel")}</Button>
            <Button size="md" variant={mode === "issue" ? "primary" : "danger"} disabled={pending || !text.trim()} onClick={submit}>{t("common.confirm")}</Button>
          </div>
        </div>
      )}
      {error && <Notice tone="error">{tx(error, errorValues)}</Notice>}
    </div>
  );
}
