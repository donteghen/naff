"use client";

import { useState } from "react";
import { useT } from "@/i18n/client";
import { formatPhone } from "@/lib/phone";
import type { DropInput } from "@/lib/schemas";
import type { ActionResult } from "@/server/errors";
import { useAction } from "./use-action";
import { Button, Card, Field, Notice, inputClass } from "./ui";

type AgencyOption = { id: string; name: string; branches: { cityId: string; address: string }[] };

/**
 * Drop at agency (origin driver, or an admin for them): agency, vehicle, agency driver's phone and the ETA.
 * Locked until the ETA is filled and, for delivery to an address, the destination driver is assigned.
 */
export function DropForm({
  agencies,
  originCityId,
  registeredUnder,
  destinationMissing,
  submit,
  loginPath = "/login",
}: {
  agencies: AgencyOption[];
  originCityId: string;
  registeredUnder: { name: string; phone: string } | null;
  destinationMissing: boolean;
  submit: (input: DropInput) => Promise<ActionResult<void>>;
  loginPath?: string;
}) {
  const { t, tx } = useT();
  const { run, pending, error, errorValues, fields } = useAction(loginPath);
  const [agencyId, setAgencyId] = useState(agencies.length === 1 ? agencies[0].id : "");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [agencyDriverPhone, setAgencyDriverPhone] = useState("");
  const [eta, setEta] = useState("");
  const locked = destinationMissing || !eta;

  return (
    <div className="flex flex-col gap-3">
      {registeredUnder && (
        <Card>
          <p className="font-extrabold">{t("drop.registerUnder")}</p>
          <p className="text-[15px]">{registeredUnder.name} · {formatPhone(registeredUnder.phone)}</p>
        </Card>
      )}
      <Field label={t("drop.agency")} error={fields.agencyId ? tx(fields.agencyId) : undefined}>
        <select className={inputClass(Boolean(fields.agencyId))} value={agencyId} onChange={(event) => setAgencyId(event.target.value)}>
          <option value="">{t("common.choose")}</option>
          {agencies.map((agency) => {
            const branch = agency.branches.find((item) => item.cityId === originCityId);
            return <option key={agency.id} value={agency.id}>{agency.name}{branch?.address ? `, ${branch.address}` : ""}</option>;
          })}
        </select>
      </Field>
      {agencies.length === 0 && <Notice tone="warning">{t("drop.noAgency")}</Notice>}
      <Field label={t("drop.vehicle")} error={fields.vehicleNumber ? tx(fields.vehicleNumber) : undefined}>
        <input className={`${inputClass(Boolean(fields.vehicleNumber))} uppercase`} value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} placeholder="LT 482 AB" />
      </Field>
      <Field label={t("drop.agencyDriverPhone")} error={fields.agencyDriverPhone ? tx(fields.agencyDriverPhone) : undefined}>
        <input className={inputClass(Boolean(fields.agencyDriverPhone))} type="tel" inputMode="tel" value={agencyDriverPhone} onChange={(event) => setAgencyDriverPhone(event.target.value)} />
      </Field>
      <div className={`rounded-2xl p-3 ${eta ? "bg-white" : "bg-white shadow-[inset_0_0_0_2px_var(--color-red)]"}`}>
        <Field label={<span>{t("drop.eta")} · <span className="text-red">{t("drop.required")}</span></span>} hint={t("drop.etaHint")} error={fields.eta ? tx(fields.eta) : undefined}>
          <input className={inputClass(Boolean(fields.eta))} type="datetime-local" value={eta} onChange={(event) => setEta(event.target.value)} />
        </Field>
      </div>
      {locked && <Notice tone="warning">{destinationMissing ? t("drop.lockedDestination") : t("drop.lockedEta")}</Notice>}
      {error && error !== "errors.checkForm" && <Notice tone="error">{tx(error, errorValues)}</Notice>}
      <Button variant="action" disabled={locked || pending} onClick={() => run("dropped", () => submit({ agencyId, vehicleNumber, agencyDriverPhone, eta }))}>
        {locked ? `${t("status.dropped_at_agency")} · ${t("drop.locked")}` : pending ? t("common.wait") : t("status.dropped_at_agency")}
      </Button>
    </div>
  );
}
