import { CallUsButton } from "@/components/site/CallUsButton";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ButtonLink, Notice } from "@/components/ui";
import { getTranslator } from "@/i18n/server";

const ITEMS = ["drugs", "weapons", "counterfeit", "wildlife", "dangerous"] as const;

export default async function ForbiddenPage() {
  const { t } = await getTranslator();
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col gap-4 px-5 pt-3 pb-8">
        <h1 className="text-[26px] font-extrabold">{t("forbidden.title")}</h1>
        <p className="text-sm text-muted">{t("forbidden.intro")}</p>
        <ul className="flex flex-col gap-2">
          {ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-3 rounded-[18px] bg-white p-4 font-bold shadow-[var(--shadow-card)]">
              <span className="rounded-full bg-red-tint px-2 py-0.5 text-xs font-extrabold text-red-ink">{t("forbidden.no")}</span>
              {t(`forbidden.${item}`)}
            </li>
          ))}
        </ul>
        <Notice tone="warning">{t("forbidden.notSure")}</Notice>
        <p className="text-xs text-muted">{t("forbidden.liability")}</p>
        <div className="mt-auto flex flex-col gap-3">
          <ButtonLink href="/request" variant="primary" className="w-full">{t("forbidden.understand")}</ButtonLink>
          <CallUsButton />
        </div>
      </main>
    </>
  );
}
