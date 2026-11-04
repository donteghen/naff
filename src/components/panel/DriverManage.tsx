"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDriverAction, endDriverSessionsAction, resetDriverPinAction, setDriverActiveAction, updateDriverAction } from "@/actions/panel-admin";
import { useT } from "@/i18n/client";
import { IconPlus } from "../Icons";
import { Modal } from "../Modal";
import { Button, Card, SectionLabel } from "../ui";
import { AccountActions } from "./AccountActions";
import { PersonForm } from "./PersonForm";

type City = { id: string; name: string };

/** "Add driver" button; the form opens in a modal and the temporary PIN is shown there once. */
export function AddDriverButton({ cities }: { cities: City[] }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="md" variant="action" onClick={() => setOpen(true)}><IconPlus size={18} />{t("drivers.add")}</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("drivers.add")}>
        <PersonForm
          initial={{ name: "", phone: "", cityId: cities.length === 1 ? cities[0].id : "" }}
          cities={cities}
          submitLabel={t("drivers.create")}
          submit={(values) => createDriverAction({ name: values.name, phone: values.phone, cityId: values.cityId ?? "" })}
          onDone={() => { setOpen(false); router.refresh(); }}
        />
      </Modal>
    </>
  );
}

export function DriverManage({ driver, cities }: { driver: { id: string; name: string; phone: string; cityId: string; active: boolean }; cities: City[] }) {
  const { t } = useT();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="flex flex-col gap-3">
        <SectionLabel>{t("people.details")}</SectionLabel>
        <PersonForm
          initial={{ name: driver.name, phone: driver.phone, cityId: driver.cityId }}
          cities={cities}
          submitLabel={t("common.save")}
          submit={(values) => updateDriverAction(driver.id, { name: values.name, phone: values.phone, cityId: values.cityId ?? "" })}
        />
      </Card>
      <Card className="flex flex-col gap-3">
        <SectionLabel>{t("people.account")}</SectionLabel>
        <p className="text-sm text-muted">{t("drivers.manageNote")}</p>
        <AccountActions
          active={driver.active}
          resetPin={() => resetDriverPinAction(driver.id)}
          endSessions={() => endDriverSessionsAction(driver.id)}
          setActive={(active) => setDriverActiveAction(driver.id, active)}
          deactivateLabel={t("drivers.suspend")}
        />
      </Card>
    </div>
  );
}
