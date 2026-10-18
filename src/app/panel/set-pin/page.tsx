import { redirect } from "next/navigation";
import { setAdminPinAction } from "@/actions/panel-admin";
import { SetPinForm } from "@/components/auth/SetPinForm";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { ADMIN_PIN_LENGTH } from "@/lib/constants";
import { getCurrentAdmin } from "@/server/auth/current";

export default async function PanelSetPinPage() {
  const { t } = await getTranslator();
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login?ended=1");
  if (!admin.mustChangePin) redirect("/settings?tab=me");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cloud p-4">
      <Card className="flex w-full max-w-md flex-col gap-4 p-6">
        <Logo size={28} />
        <h1 className="text-2xl font-extrabold">{t("auth.setPinTitle")}</h1>
        <p className="text-sm text-muted">{t("auth.setPinIntro")}</p>
        <SetPinForm action={setAdminPinAction} pinLength={ADMIN_PIN_LENGTH} requireCurrent={false} afterSave="/" loginPath="/login" />
      </Card>
    </main>
  );
}
