import { redirect } from "next/navigation";
import { setDriverPinAction } from "@/actions/driver";
import { SetPinForm } from "@/components/auth/SetPinForm";
import { Logo } from "@/components/Logo";
import { getTranslator } from "@/i18n/server";
import { DRIVER_PIN_LENGTH } from "@/lib/constants";
import { getCurrentDriver } from "@/server/auth/current";

export default async function DriverSetPinPage() {
  const { t } = await getTranslator();
  const driver = await getCurrentDriver();
  if (!driver) redirect("/login?ended=1");
  if (!driver.mustChangePin) redirect("/pin");
  return (
    <main className="flex min-h-dvh flex-col bg-navy">
      <div className="px-6 pt-8"><Logo onDark size={30} /></div>
      <h1 className="px-6 pt-4 pb-2 text-2xl font-extrabold text-white">{t("auth.setPinTitle")}</h1>
      <p className="px-6 pb-8 text-side-text">{t("auth.setPinIntro")}</p>
      <div className="flex-1 rounded-t-[28px] bg-mist px-6 pt-8 pb-10">
        <SetPinForm action={setDriverPinAction} pinLength={DRIVER_PIN_LENGTH} requireCurrent={false} afterSave="/" loginPath="/login" />
      </div>
    </main>
  );
}
