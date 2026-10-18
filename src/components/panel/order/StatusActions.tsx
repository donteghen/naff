"use client";

import { useState } from "react";
import {
  arrivedAction,
  collectedForDriverAction,
  confirmDropAction,
  deliveredAtAgencyAction,
  deliveredForDriverAction,
  destinationPhotoAction,
  droppedForDriverAction,
  pickedUpForDriverAction,
  respondForDriverAction,
  unlockCodeAction,
} from "@/actions/panel-orders";
import { useT } from "@/i18n/client";
import { formatDateTime } from "@/lib/dates";
import { formatXAF } from "@/lib/money";
import type { AgencyOption } from "@/server/services/places";
import type { AdminOrderView } from "@/server/services/order-views";
import { CodeEntry } from "../../CodeEntry";
import { DropForm } from "../../DropForm";
import { useAction } from "../../use-action";
import { Button, Notice } from "../../ui";

/**
 * The next step for this order. Admin steps (confirm drop, arrived, delivered at agency)
 * and driver steps done on the driver's behalf when they have no network.
 */
export function StatusActions({ order, agencies }: { order: AdminOrderView; agencies: AgencyOption[] }) {
  const { t, tx, language } = useT();
  const { run, pending, error, errorValues } = useAction();
  const [code, setCode] = useState("");
  const onBehalf = (name: string) => <p className="text-xs font-bold text-muted">{t("actions.onBehalf", { name })}</p>;
  const errorBox = error && <Notice tone="error">{tx(error, errorValues)}</Notice>;

  const blocks: React.ReactNode[] = [];

  if (order.status === "assigned" && order.originDriver) {
    blocks.push(
      <div key="respond" className="flex flex-col gap-2">
        {onBehalf(order.originDriver.name)}
        <div className="grid grid-cols-2 gap-2">
          <Button size="md" variant="primary" disabled={pending} onClick={() => run("respond", () => respondForDriverAction(order.id, "origin", true))}>{t("driver.confirmJob")}</Button>
          <Button size="md" variant="secondary" disabled={pending} onClick={() => run("respond", () => respondForDriverAction(order.id, "origin", false))}>{t("driver.declineJob")}</Button>
        </div>
      </div>,
    );
  }

  if (order.destinationDriver && !order.destinationConfirmedAt && !["delivered", "cancelled", "failed"].includes(order.status)) {
    blocks.push(
      <div key="respond-destination" className="flex flex-col gap-2">
        {onBehalf(order.destinationDriver.name)}
        <div className="grid grid-cols-2 gap-2">
          <Button size="md" variant="secondary" disabled={pending} onClick={() => run("respond", () => respondForDriverAction(order.id, "destination", true))}>{t("actions.confirmDestination")}</Button>
          <Button size="md" variant="secondary" disabled={pending} onClick={() => run("respond", () => respondForDriverAction(order.id, "destination", false))}>{t("driver.declineJob")}</Button>
        </div>
      </div>,
    );
  }

  if (order.status === "driver_confirmed" && order.originDriver) {
    const collect = order.fee.timing === "pickup" && order.fee.status === "unpaid" ? order.netPrice ?? 0 : 0;
    blocks.push(
      <div key="pickup" className="flex flex-col gap-2">
        {onBehalf(order.originDriver.name)}
        {collect > 0 && <Notice tone="warning">{t("actions.pickupCollects", { amount: formatXAF(collect), name: order.originDriver.name })}</Notice>}
        <Button size="md" variant="action" disabled={pending} onClick={() => run("pickedUp", () => pickedUpForDriverAction(order.id))}>{t("status.picked_up")}</Button>
      </div>,
    );
  }

  if (order.status === "picked_up" && order.type === "intercity" && order.originDriver) {
    const registeredUnder = order.intercityMode === "to_address" ? order.destinationDriver : order.receiver;
    blocks.push(
      <div key="drop" className="flex flex-col gap-2">
        {onBehalf(order.originDriver.name)}
        <DropForm agencies={agencies} originCityId={order.originCityId} registeredUnder={registeredUnder} destinationMissing={order.intercityMode === "to_address" && !order.destinationDriver} submit={(input) => droppedForDriverAction(order.id, input)} />
      </div>,
    );
  }

  if (order.status === "dropped_at_agency") {
    blocks.push(
      <div key="confirm-drop" className="flex flex-col gap-2">
        <p className="text-sm">
          {order.handover.agencyName} · {order.handover.vehicleNumber} · {t("drop.eta")} {order.handover.eta ? formatDateTime(order.handover.eta, language) : "—"}
        </p>
        <Notice tone="info">{t("actions.checkOriginPhoto")}</Notice>
        <Button size="md" variant="action" disabled={pending} onClick={() => run("confirmDrop", () => confirmDropAction(order.id))}>{t("actions.confirmDrop")}</Button>
      </div>,
    );
  }

  if (order.status === "in_transit") {
    blocks.push(
      <div key="arrived" className="flex flex-col gap-2">
        {order.etaPassed && <Notice tone="error">{t("actions.etaPassed")}</Notice>}
        <Button size="md" variant="action" disabled={pending} onClick={() => run("arrived", () => arrivedAction(order.id))}>{t("status.arrived_at_agency_b")}</Button>
      </div>,
    );
  }

  if (order.status === "arrived_at_agency_b" && order.intercityMode === "collect_at_agency") {
    blocks.push(
      <div key="delivered-agency" className="flex flex-col gap-2">
        <Notice tone="info">{t("actions.phoneReceiverFirst")}</Notice>
        <Button size="md" variant="action" disabled={pending} onClick={() => run("deliveredAtAgency", () => deliveredAtAgencyAction(order.id))}>{t("actions.deliveredAtAgency")}</Button>
      </div>,
    );
  }

  if (order.status === "arrived_at_agency_b" && order.intercityMode === "to_address" && order.destinationDriver) {
    blocks.push(
      <div key="collected" className="flex flex-col gap-2">
        {onBehalf(order.destinationDriver.name)}
        <Button size="md" variant="action" disabled={pending || !order.destinationConfirmedAt} onClick={() => run("collected", () => collectedForDriverAction(order.id))}>{t("status.collected_at_destination")}</Button>
        {!order.destinationConfirmedAt && <p className="text-xs text-muted">{t("errors.confirmJobFirst")}</p>}
      </div>,
    );
  }

  const finalRole = order.type === "local" ? "origin" : "destination";
  const finalDriver = finalRole === "origin" ? order.originDriver : order.destinationDriver;
  const finalLeg = (order.type === "local" && order.status === "picked_up") || order.status === "collected_at_destination";
  if (finalLeg && finalDriver) {
    blocks.push(
      <div key="delivered" className="flex flex-col gap-2">
        {onBehalf(finalDriver.name)}
        <p className="text-sm">{t("actions.codeFromDriver")}</p>
        <CodeEntry onChange={setCode} disabled={order.codeLocked} />
        <Button size="md" variant="action" disabled={pending || code.length !== 4 || order.codeLocked} onClick={() => run("delivered", () => deliveredForDriverAction(order.id, finalRole, code))}>{t("driver.confirmDelivered")}</Button>
      </div>,
    );
  }

  if (order.codeLocked) {
    blocks.push(
      <div key="unlock" className="flex flex-col gap-2">
        <Notice tone="error">{t("actions.codeLocked", { attempts: order.codeAttempts })}</Notice>
        <Button size="md" variant="secondary" disabled={pending} onClick={() => run("unlock", () => unlockCodeAction(order.id))}>{t("actions.unlockCode")}</Button>
      </div>,
    );
  }

  if (order.intercityMode === "to_address" && ["arrived_at_agency_b", "collected_at_destination", "delivered"].includes(order.status)) {
    blocks.push(
      <label key="photo" className="flex min-h-12 items-center gap-3 rounded-2xl bg-mist px-4 font-bold">
        <input type="checkbox" className="h-5 w-5 accent-[#0B1B3F]" checked={order.handover.destinationPhotoConfirmed} disabled={pending} onChange={(event) => run("destinationPhoto", () => destinationPhotoAction(order.id, event.target.checked))} />
        {t("actions.destinationPhoto")}
      </label>,
    );
  }

  if (blocks.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {blocks}
      {errorBox}
    </div>
  );
}
