"use client";

import { useRouter } from "next/navigation";
import { createDriverAction, endDriverSessionsAction, resetDriverPinAction, setDriverActiveAction, updateDriverAction } from "@/actions/panel-admin";
import { useT } from "@/i18n/client";
import { Card, SectionLabel } from "../ui";
import { AccountActions } from "./AccountActions";
import { PersonForm } from "./PersonForm";

type City = { id: string; name: string };

export function AddDriver({ cities }: { cities: City[] }) {
  const { t } = useT();
  const router = useRouter();
  return (
    <PersonForm
      key="add"
      initial={{ name: "", phone: "", cityId: cities.length === 1 ? cities[0].id : "" }}
      cities={cities}
      submitLabel={t("drivers.create")}
      submit={(values) => createDriverAction({ name: values.name, phone: values.phone, cityId: values.cityId ?? "" })}
      onDone={() => router.refresh()}
    />
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
