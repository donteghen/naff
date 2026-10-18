"use client";

import { arrivedAction, confirmDropAction, deliveredAtAgencyAction } from "@/actions/panel-orders";
import { useT } from "@/i18n/client";
import type { IntercityMode, OrderStatus } from "@/lib/constants";
import { useAction } from "../use-action";
import { Button } from "../ui";

/** One-tap follow-up actions on the in-transit board. */
export function InTransitActions({ orderId, status, mode }: { orderId: string; status: OrderStatus; mode: IntercityMode | null }) {
  const { t, tx } = useT();
  const { run, pending, error } = useAction();
  let button = null;
  if (status === "dropped_at_agency") button = <Button size="sm" variant="action" disabled={pending} onClick={() => run("confirmDrop", () => confirmDropAction(orderId))}>{t("transit.confirmDrop")}</Button>;
  if (status === "in_transit") button = <Button size="sm" variant="action" disabled={pending} onClick={() => run("arrived", () => arrivedAction(orderId))}>{t("status.arrived_at_agency_b")}</Button>;
  if (status === "arrived_at_agency_b" && mode === "collect_at_agency") button = <Button size="sm" variant="primary" disabled={pending} onClick={() => run("deliveredAtAgency", () => deliveredAtAgencyAction(orderId))}>{t("actions.deliveredAtAgency")}</Button>;
  if (status === "arrived_at_agency_b" && mode === "to_address") button = <span className="text-xs font-bold text-muted">{t("transit.waitingDestination")}</span>;
  return (
    <div className="flex flex-col items-end gap-1">
      {button}
      {error && <span className="text-xs font-bold text-red">{tx(error)}</span>}
    </div>
  );
}
