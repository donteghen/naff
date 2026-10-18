import { redirect } from "next/navigation";
import { setUserPinAction } from "@/actions/site";
import { SetPinForm } from "@/components/auth/SetPinForm";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getTranslator } from "@/i18n/server";
import { USER_PIN_LENGTH } from "@/lib/constants";
import { getCurrentUser } from "@/server/auth/current";

export default async function UserSetPinPage() {
  const { t } = await getTranslator();
  const user = await getCurrentUser();
  if (!user) redirect("/account/login?ended=1");
  if (!user.mustChangePin) redirect("/account");
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-6 pb-8">
        <h1 className="text-[26px] font-extrabold">{t("auth.setPinTitle")}</h1>
        <p className="text-sm text-muted">{t("auth.setPinIntro")}</p>
        <SetPinForm action={setUserPinAction} pinLength={USER_PIN_LENGTH} requireCurrent={false} afterSave="/home" loginPath="/account/login" />
      </main>
    </>
  );
}
