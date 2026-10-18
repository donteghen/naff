"use client";

import { endUserSessionsAction, resetUserPinAction, setUserActiveAction, updateUserAction } from "@/actions/panel-admin";
import { useT } from "@/i18n/client";
import { Card, SectionLabel } from "../ui";
import { AccountActions } from "./AccountActions";
import { PersonForm } from "./PersonForm";

export function UserManage({ user }: { user: { id: string; name: string; phone: string; email: string; active: boolean } }) {
  const { t } = useT();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="flex flex-col gap-3">
        <SectionLabel>{t("people.details")}</SectionLabel>
        <PersonForm
          initial={{ name: user.name, phone: user.phone, email: user.email }}
          withEmail
          emailRequired
          submitLabel={t("common.save")}
          submit={(values) => updateUserAction(user.id, { name: values.name, phone: values.phone, email: values.email ?? "" })}
        />
      </Card>
      <Card className="flex flex-col gap-3">
        <SectionLabel>{t("people.account")}</SectionLabel>
        <p className="text-sm text-muted">{t("users.manageNote")}</p>
        <AccountActions
          active={user.active}
          resetPin={() => resetUserPinAction(user.id)}
          endSessions={() => endUserSessionsAction(user.id)}
          setActive={(active) => setUserActiveAction(user.id, active)}
          deactivateLabel={t("people.deactivate")}
        />
      </Card>
    </div>
  );
}
