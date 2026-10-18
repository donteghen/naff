import { redirect } from "next/navigation";
import { loginDriverAction } from "@/actions/driver";
import { LoginForm } from "@/components/auth/LoginForm";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo } from "@/components/Logo";
import { getTranslator } from "@/i18n/server";
import { DRIVER_PIN_LENGTH } from "@/lib/constants";
import { getCurrentDriver } from "@/server/auth/current";

export default async function DriverLoginPage({ searchParams }: { searchParams: Promise<{ ended?: string }> }) {
  const { t } = await getTranslator();
  const driver = await getCurrentDriver();
  if (driver && !driver.mustChangePin) redirect("/");
  const { ended } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col bg-navy">
      <div className="flex items-center justify-between px-6 pt-8">
        <Logo onDark size={30} />
        <LanguageSwitch onDark />
      </div>
      <h1 className="px-6 pt-4 pb-8 text-3xl font-extrabold text-white">{t("driver.title")}</h1>
      <div className="flex-1 rounded-t-[28px] bg-mist px-6 pt-8 pb-10">
        <LoginForm action={loginDriverAction} pinLength={DRIVER_PIN_LENGTH} afterLogin="/" setPinPath="/set-pin" ended={ended === "1"} footer={<p className="text-center text-sm text-muted">{t("driver.forgotPin")}</p>} />
      </div>
    </main>
  );
}
