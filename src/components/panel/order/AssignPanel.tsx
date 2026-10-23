"use client";

import { useState } from "react";
import { assignDriverAction, unassignDriverAction } from "@/actions/panel-orders";
import { useT } from "@/i18n/client";
import { formatPhone } from "@/lib/phone";
import type { DriverOption } from "@/server/services/order-queries";
import { whatsappLink } from "@/lib/whatsapp";
import { IconWhatsApp } from "../../Icons";
import { useAction } from "../../use-action";
import { useWhatsAppMode } from "./WhatsAppButtons";
import { Avatar, Button, Chip, Notice } from "../../ui";

type Role = "origin" | "destination";

/** Drivers of the right city with availability and current jobs. Assignment is a human decision. */
export function AssignPanel({
  orderId,
  role,
  cityId,
  cityName,
  drivers,
  current,
  confirmed,
  canChange,
  jobMessage,
}: {
  orderId: string;
  role: Role;
  cityId: string;
  cityName: string;
  drivers: DriverOption[];
  current: { id: string; name: string; phone: string } | null;
  confirmed: boolean;
  canChange: boolean;
  /** Prefilled "Send job details" text, only once a driver is assigned. */
  jobMessage: string | null;
}) {
  const { t, tx } = useT();
  const { run, pending, error, errorValues } = useAction();
  const [open, setOpen] = useState(!current);
  const [mode] = useWhatsAppMode();
  const options = drivers.filter((driver) => driver.cityId === cityId && driver.active);

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-mist p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-extrabold">{role === "origin" ? t("assign.originDriver") : t("assign.destinationDriver")} · <span className="text-muted">{cityName}</span></p>
        {current && canChange && (
          <button type="button" className="min-h-10 text-sm font-bold text-indigo" onClick={() => setOpen(!open)}>{open ? t("common.close") : t("assign.change")}</button>
        )}
      </div>
      {current ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{current.name}</span>
          <span className="text-sm text-muted">{formatPhone(current.phone)}</span>
          <Chip tone={confirmed ? "green" : "amber"}>{confirmed ? t("assign.confirmed") : t("assign.awaiting")}</Chip>
          {jobMessage && (
            <a
              href={whatsappLink(current.phone, jobMessage, mode)}
              target={mode === "web" ? "_blank" : undefined}
              rel="noreferrer"
              className="press inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-green-tint px-3 text-sm font-extrabold text-green-ink"
            >
              <IconWhatsApp size={16} />
              {t("wa.sendJobDetails")}
            </a>
          )}
          {canChange && !confirmed && (
            <button type="button" disabled={pending} className="min-h-10 text-sm font-bold text-red" onClick={() => run("unassign", () => unassignDriverAction(orderId, role))}>{t("assign.unassign")}</button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">{t("assign.none")}</p>
      )}
      {open && canChange && (
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto thin-scroll">
          {options.length === 0 && <li className="text-sm text-muted">{t("assign.noDrivers")}</li>}
          {options.map((driver) => (
            <li key={driver.id} className="flex items-center gap-3 rounded-xl bg-white p-2.5">
              <Avatar name={driver.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{driver.name}</p>
                <p className="truncate text-xs text-muted">
                  {formatPhone(driver.phone)} · {driver.currentJobs.length > 0 ? driver.currentJobs.map((job) => `NF-${job.number}`).join(", ") : t("assign.noJob")}
                </p>
              </div>
              <Chip tone={driver.currentJobs.length > 0 ? "amber" : driver.available ? "green" : "grey"}>
                {driver.currentJobs.length > 0 ? t("assign.onJob") : driver.available ? t("driver.available") : t("driver.offline")}
              </Chip>
              <Button size="sm" variant="secondary" disabled={pending || driver.id === current?.id} onClick={() => run("assign", () => assignDriverAction(orderId, role, driver.id), () => setOpen(false))}>
                {t("assign.assign")}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && <Notice tone="error">{tx(error, errorValues)}</Notice>}
    </div>
  );
}
