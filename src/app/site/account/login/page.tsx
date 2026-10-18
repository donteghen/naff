import Link from "next/link";
import { redirect } from "next/navigation";
import { loginUserAction } from "@/actions/site";
import { LoginForm } from "@/components/auth/LoginForm";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getTranslator } from "@/i18n/server";
import { USER_PIN_LENGTH } from "@/lib/constants";
import { percent } from "@/lib/money";
import { getCurrentUser } from "@/server/auth/current";
import { getSettings } from "@/server/services/settings";

function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function UserLoginPage({ searchParams }: { searchParams: Promise<{ next?: string; ended?: string }> }) {
  const { t } = await getTranslator();
  const { next, ended } = await searchParams;
  const user = await getCurrentUser();
  if (user && !user.mustChangePin) redirect(safeNext(next));
  const settings = await getSettings();
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-6 pb-8">
        <h1 className="text-[28px] font-extrabold">{t("site.welcomeBack")}</h1>
        <LoginForm
          action={loginUserAction}
          pinLength={USER_PIN_LENGTH}
          afterLogin={safeNext(next)}
          setPinPath="/account/set-pin"
          ended={ended === "1"}
          footer={
            <div className="flex flex-col items-center gap-3 pt-2 text-sm font-bold">
              <Link href="/account/forgot" className="min-h-10 text-indigo">{t("site.forgotPin")}</Link>
              <Link href="/account/register" className="min-h-10">
                {t("site.newHere")}{settings.discountRate > 0 ? ` · ${t("site.percentOff", { rate: percent(settings.discountRate) })}` : ""}
              </Link>
            </div>
          }
        />
      </main>
    </>
  );
}
