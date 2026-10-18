import { redirect } from "next/navigation";
import { loginAdminAction } from "@/actions/panel-admin";
import { LoginForm } from "@/components/auth/LoginForm";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo } from "@/components/Logo";
import { getTranslator } from "@/i18n/server";
import { ADMIN_PIN_LENGTH } from "@/lib/constants";
import { getCurrentAdmin } from "@/server/auth/current";

export default async function PanelLoginPage({ searchParams }: { searchParams: Promise<{ ended?: string }> }) {
  const { t } = await getTranslator();
  const admin = await getCurrentAdmin();
  if (admin && !admin.mustChangePin) redirect("/");
  const { ended } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cloud md:p-8">
      <div className="flex min-h-dvh w-full max-w-[1000px] flex-col overflow-hidden bg-mist md:min-h-[600px] md:flex-row md:rounded-[24px] md:shadow-[var(--shadow-float)]">
        <div className="flex flex-col justify-between bg-navy p-6 md:w-[42%] md:p-10">
          <Logo onDark size={30} />
          <div className="py-6 md:py-0">
            <h1 className="text-[28px] font-extrabold text-white md:text-[34px]">{t("panel.console")}</h1>
            <p className="text-side-text">{t("panel.consoleIntro")}</p>
          </div>
          <p className="hidden text-xs text-side-text md:block">{t("panel.authorisedOnly")}</p>
        </div>
        <div className="-mt-5 flex flex-1 flex-col justify-center rounded-t-[26px] bg-mist px-6 py-8 md:mt-0 md:rounded-none md:px-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold">{t("panel.signIn")}</h2>
            <LanguageSwitch />
          </div>
          <LoginForm action={loginAdminAction} pinLength={ADMIN_PIN_LENGTH} afterLogin="/" setPinPath="/set-pin" ended={ended === "1"} footer={<p className="text-center text-sm text-muted">{t("panel.forgotPin")}</p>} />
        </div>
      </div>
    </main>
  );
}
