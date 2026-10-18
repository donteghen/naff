import Link from "next/link";
import { setDriverPinAction } from "@/actions/driver";
import { SetPinForm } from "@/components/auth/SetPinForm";
import { DriverHeader } from "@/components/driver/DriverHeader";
import { IconBack } from "@/components/Icons";
import { Card } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { DRIVER_PIN_LENGTH } from "@/lib/constants";
import { requireDriverPage } from "@/server/auth/current";

export default async function DriverPinPage() {
  const driver = await requireDriverPage();
  const { t } = await getTranslator();
  return (
    <>
      <DriverHeader available={driver.available} />
      <main className="flex flex-col gap-4 p-4">
        <Link href="/" className="inline-flex min-h-11 items-center gap-1 font-bold text-muted"><IconBack size={18} />{t("common.back")}</Link>
        <h1 className="text-2xl font-extrabold">{t("auth.changePin")}</h1>
        <Card>
          <SetPinForm action={setDriverPinAction} pinLength={DRIVER_PIN_LENGTH} requireCurrent loginPath="/login" />
        </Card>
      </main>
    </>
  );
}
