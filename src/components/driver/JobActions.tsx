"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { collectedAction, deliveredAction, droppedAtAgencyAction, pickedUpAction, respondToJobAction } from "@/actions/driver";
import { useT } from "@/i18n/client";
import { formatAmount } from "@/lib/money";
import type { DriverJobView } from "@/server/services/order-views";
import { CodeEntry } from "../CodeEntry";
import { IconWhatsApp } from "../Icons";
import { DropForm } from "../DropForm";
import { MoneyCard } from "../MoneyCard";
import { useAction } from "../use-action";
import { Button, Card, Notice } from "../ui";

type AgencyOption = { id: string; name: string; branches: { cityId: string; address: string }[] };

/** Only the button for the next step is shown. */
export function JobActions({ job, agencies, originCityId, photoHref }: { job: DriverJobView; agencies: AgencyOption[]; originCityId: string; photoHref: string | null }) {
  const { t, tx } = useT();
  const router = useRouter();
  const { run, pending, error, errorValues } = useAction();
  const [code, setCode] = useState("");
  const method = tx(`method.${job.feeMethod}`);

  const errorBox = error && <Notice tone="error">{tx(error, errorValues)}</Notice>;
  // Parcel photo to the office on WhatsApp (proof at the agency drop and collection).
  const photoButton = photoHref && (
    <a href={photoHref} className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-green-tint px-4 font-extrabold text-green-ink">
      <IconWhatsApp size={18} />
      {t("driver.sendPhoto")}
    </a>
  );

  if (!job.confirmed) {
    return (
      <div className="flex flex-col gap-3">
        {errorBox}
        <Button variant="action" disabled={pending} onClick={() => run("confirmJob", () => respondToJobAction(job.id, job.role, true))}>
          {t("driver.confirmJob")}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={() => run("declineJob", () => respondToJobAction(job.id, job.role, false), () => router.push("/"))}>
          {t("driver.declineJob")}
        </Button>
      </div>
    );
  }

  if (job.role === "origin" && job.status === "driver_confirmed") {
    return (
      <div className="flex flex-col gap-3">
        {job.collectAtPickup > 0 ? (
          <MoneyCard title={t("driver.collectFromSender")} amount={job.collectAtPickup} note={t("driver.collectBeforePickup", { method })} />
        ) : (
          job.feePaid && <Notice tone="success">{t("driver.prepaid")}</Notice>
        )}
        {errorBox}
        <Button variant="action" disabled={pending} onClick={() => run("pickedUp", () => pickedUpAction(job.id))}>
          {job.collectAtPickup > 0 ? t("driver.collectedPickedUp", { amount: formatAmount(job.collectAtPickup) }) : t("status.picked_up")}
        </Button>
      </div>
    );
  }

  if (job.role === "origin" && job.status === "picked_up" && job.type === "intercity") {
    const registeredUnder = job.intercityMode === "to_address" ? job.destinationDriver : { name: job.receiver.name, phone: job.receiver.phone };
    return (
      <div className="flex flex-col gap-3">
      {photoButton}
      <DropForm
        agencies={agencies}
        originCityId={originCityId}
        registeredUnder={registeredUnder}
        destinationMissing={job.intercityMode === "to_address" && !job.destinationDriverAssigned}
        submit={(input) => droppedAtAgencyAction(job.id, input)}
      />
      </div>
    );
  }

  if (job.role === "destination" && job.status === "arrived_at_agency_b") {
    return (
      <div className="flex flex-col gap-3">
        <Card>
          <p className="font-extrabold">{t("driver.collectAt", { agency: job.handover.agencyName })}</p>
          <p className="text-sm">{t("driver.vehicleAskFor", { vehicle: job.handover.vehicleNumber, name: job.handover.registeredUnderName })}</p>
        </Card>
        <Notice tone="info">{t("driver.photoBeforeCollect")}</Notice>
        {photoButton}
        {errorBox}
        <Button variant="action" disabled={pending} onClick={() => run("collected", () => collectedAction(job.id))}>
          {t("status.collected_at_destination")}
        </Button>
      </div>
    );
  }

  const finalLeg = (job.role === "origin" && job.type === "local" && job.status === "picked_up") || (job.role === "destination" && job.status === "collected_at_destination");
  if (finalLeg) {
    const due = job.collectAtDelivery.fee + job.collectAtDelivery.goods;
    let note = t("driver.feeBeforeHandover", { method });
    if (job.collectAtDelivery.goods > 0 && job.collectAtDelivery.fee > 0) note = t("driver.goodsPlusFee", { goods: formatAmount(job.collectAtDelivery.goods), fee: formatAmount(job.collectAtDelivery.fee) });
    else if (job.collectAtDelivery.goods > 0) note = t("driver.goodsBeforeHandover");
    return (
      <div className="flex flex-col gap-3">
        {due > 0 && <MoneyCard title={t("driver.collectFromReceiver")} amount={due} note={note} />}
        <Card className="flex flex-col gap-3">
          <p className="text-center font-extrabold">{t("driver.codeLabel")}</p>
          <CodeEntry onChange={setCode} disabled={job.codeLocked} />
          {job.codeLocked && <Notice tone="error">{t("errors.codeLocked")}</Notice>}
        </Card>
        {errorBox}
        <Button variant="action" disabled={pending || code.length !== 4 || job.codeLocked} onClick={() => run("delivered", () => deliveredAction(job.id, code))}>
          {t("driver.confirmDelivered")}
        </Button>
      </div>
    );
  }

  return null;
}
