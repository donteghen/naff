import Link from "next/link";
import { logoutUserAction, setUserPinAction } from "@/actions/site";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { SetPinForm } from "@/components/auth/SetPinForm";
import { ProfileForm } from "@/components/site/ProfileForm";
import { SiteHeader } from "@/components/site/SiteHeader";
import { IconChevron } from "@/components/Icons";
import { Avatar, Card, Notice, SectionLabel } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { USER_PIN_LENGTH } from "@/lib/constants";
import { percent } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { requireUserPage } from "@/server/auth/current";
import { getSettings } from "@/server/services/settings";

export const metadata = { robots: { index: false, follow: false } };

export default async function AccountPage() {
  const user = await requireUserPage("/account");
  const { t } = await getTranslator();
  const settings = await getSettings();
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-8">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} tone="amber" size={52} />
          <div>
            <p className="text-lg font-extrabold">{user.name}</p>
            <p className="text-sm text-muted">{formatPhone(user.phone)}</p>
          </div>
        </div>
        {settings.discountRate > 0 && <Notice tone="warning">{t("site.discountActive", { rate: percent(settings.discountRate) })}</Notice>}
        <Link href="/orders" className="press flex items-center justify-between rounded-[18px] bg-white p-4 font-extrabold shadow-[var(--shadow-card)]">
          {t("site.myOrders")}<IconChevron className="text-faint" />
        </Link>
        <SectionLabel>{t("site.profile")}</SectionLabel>
        <Card><ProfileForm initial={{ name: user.name, phone: formatPhone(user.phone), email: user.email }} /></Card>
        <SectionLabel>{t("auth.changePin")}</SectionLabel>
        <Card><SetPinForm action={setUserPinAction} pinLength={USER_PIN_LENGTH} requireCurrent loginPath="/account/login" /></Card>
        <LogoutButton action={logoutUserAction} afterLogout="/" className="w-full rounded-2xl bg-white shadow-[inset_0_0_0_2px_var(--color-field)]" />
      </main>
    </>
  );
}
